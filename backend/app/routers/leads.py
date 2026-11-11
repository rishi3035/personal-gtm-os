import json
import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from app.core.database import get_db
from app.models.lead import Lead, EmailCandidate
from app.models.workspace import Workspace
from app.models.email import EmailDraft
from app.schemas.lead import LeadResponse, LeadCreate, LeadStats
from app.services.verifier_service import EmailVerifier
from app.services.personalization_service import PersonalizationService
from app.services.research_pitch_service import ResearchPitchService
from app.services.export_service import ExportService

router = APIRouter(prefix="/api/leads", tags=["Leads"])

class SelectEmailRequest(BaseModel):
    email: str
    status: Optional[str] = "selected"

class BatchResearchRequest(BaseModel):
    workspace_id: int = 1
    limit: int = 20


@router.get("", response_model=List[LeadResponse])
def list_leads(
    workspace_id: Optional[int] = None,
    email_status: Optional[str] = None,
    outreach_status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Lead)
    if workspace_id:
        query = query.filter(Lead.workspace_id == workspace_id)
    if email_status:
        query = query.filter(Lead.email_status == email_status)
    if outreach_status:
        query = query.filter(Lead.outreach_status == outreach_status)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Lead.full_name.ilike(s),
                Lead.company_name.ilike(s),
                Lead.email.ilike(s),
                Lead.job_title.ilike(s)
            )
        )
    return query.order_by(Lead.id.desc()).offset(skip).limit(limit).all()

@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.post("", response_model=LeadResponse)
def create_lead(lead_in: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**lead_in.dict())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"status": "success", "message": f"Lead {lead_id} deleted"}

@router.post("/{lead_id}/verify")
def verify_lead_emails(lead_id: int, db: Session = Depends(get_db)):
    """
    Runs DNS MX queries and RFC 5321 Port 25 SMTP handshake checks across all candidate emails
    for this lead. Selects the highest-scoring valid email.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    candidates = db.query(EmailCandidate).filter(EmailCandidate.lead_id == lead_id).all()
    if not candidates and lead.email:
        # Create candidate for primary email if missing
        c = EmailCandidate(lead_id=lead.id, email=lead.email, pattern="direct", status="untested")
        db.add(c)
        db.flush()
        candidates = [c]

    results = []
    best_candidate = None
    highest_score = -1

    for c in candidates:
        res = EmailVerifier.verify_smtp_handshake(c.email)
        c.mx_found = res.get("mx_found", False)
        c.mx_host = res.get("mx_host")
        c.smtp_code = res.get("smtp_code")
        c.smtp_message = res.get("reason")
        c.is_catch_all = res.get("is_catch_all", False)
        c.status = res.get("status", "unknown")
        c.tested_at = datetime.utcnow()

        score = res.get("score", 0)
        if score > highest_score:
            highest_score = score
            best_candidate = c

        results.append(res)

    if best_candidate and highest_score >= 50:
        lead.email = best_candidate.email
        lead.email_status = best_candidate.status
        lead.email_score = highest_score

    db.commit()
    return {
        "status": "success",
        "lead_id": lead_id,
        "selected_email": lead.email,
        "email_status": lead.email_status,
        "email_score": lead.email_score,
        "results": results
    }

@router.post("/{lead_id}/generate-drafts")
def generate_drafts(lead_id: int, db: Session = Depends(get_db)):
    """
    Generates Day 0, Day 3, and Day 7 personalized email sequence drafts.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    workspace = db.query(Workspace).filter(Workspace.id == lead.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Generate sequence drafts
    draft_specs = PersonalizationService.generate_drafts_for_lead(lead, workspace)

    created_drafts = []
    for spec in draft_specs:
        existing = db.query(EmailDraft).filter(
            EmailDraft.lead_id == lead.id,
            EmailDraft.step == spec["step"]
        ).first()

        if not existing:
            draft = EmailDraft(
                workspace_id=workspace.id,
                lead_id=lead.id,
                step=spec["step"],
                subject=spec["subject"],
                body_text=spec["body_text"],
                hook_rationale=spec["hook_rationale"],
                status="draft"
            )
            db.add(draft)
            db.flush()
            created_drafts.append(draft.id)
        else:
            if existing.status == "draft":
                existing.subject = spec["subject"]
                existing.body_text = spec["body_text"]
                existing.hook_rationale = spec["hook_rationale"]
                created_drafts.append(existing.id)

    lead.outreach_status = "drafted"
    db.commit()

    return {
        "status": "success",
        "lead_id": lead_id,
        "draft_ids": created_drafts,
        "count": len(created_drafts)
    }

@router.post("/{lead_id}/research-and-pitch")
def research_and_pitch_lead(lead_id: int, db: Session = Depends(get_db)):
    """
    Performs company & role intelligence analysis and generates a ready-to-send
    HackMyWebsite pitch email for the lead.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    workspace = db.query(Workspace).filter(Workspace.id == lead.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Generate research dossier & ready-to-send pitch
    result = ResearchPitchService.generate_research_pitch(lead, workspace)
    dossier = result["dossier"]
    pitch = result["pitch_email"]

    # Save dossier as JSON in enrichment_data
    lead.enrichment_data = json.dumps(dossier, ensure_ascii=False)
    lead.outreach_status = "researched"

    # Save or update step 0 draft
    draft = db.query(EmailDraft).filter(
        EmailDraft.lead_id == lead.id,
        EmailDraft.step == 0
    ).first()

    if not draft:
        draft = EmailDraft(
            workspace_id=workspace.id,
            lead_id=lead.id,
            step=0,
            subject=pitch["subject"],
            body_text=pitch["body_text"],
            hook_rationale=pitch["hook_rationale"],
            status="draft"
        )
        db.add(draft)
    else:
        if draft.status == "draft":
            draft.subject = pitch["subject"]
            draft.body_text = pitch["body_text"]
            draft.hook_rationale = pitch["hook_rationale"]

    db.commit()
    db.refresh(lead)

    return {
        "status": "success",
        "lead_id": lead.id,
        "full_name": lead.full_name,
        "company": lead.company_name,
        "work_email": lead.email,
        "dossier": dossier,
        "pitch_email": {
            "draft_id": draft.id if draft else None,
            "recipient": lead.email,
            "subject": draft.subject if draft else pitch["subject"],
            "body_text": draft.body_text if draft else pitch["body_text"],
            "status": draft.status if draft else "draft"
        }
    }

@router.post("/batch-research")
def batch_research(payload: BatchResearchRequest, db: Session = Depends(get_db)):
    """
    Runs research and ready-to-send pitch generation across a batch of leads in the workspace.
    """
    workspace = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    leads = db.query(Lead).filter(
        Lead.workspace_id == payload.workspace_id
    ).limit(payload.limit).all()

    researched_count = 0
    for lead in leads:
        result = ResearchPitchService.generate_research_pitch(lead, workspace)
        dossier = result["dossier"]
        pitch = result["pitch_email"]

        lead.enrichment_data = json.dumps(dossier, ensure_ascii=False)
        if lead.outreach_status == "new":
            lead.outreach_status = "researched"

        draft = db.query(EmailDraft).filter(
            EmailDraft.lead_id == lead.id,
            EmailDraft.step == 0
        ).first()

        if not draft:
            draft = EmailDraft(
                workspace_id=workspace.id,
                lead_id=lead.id,
                step=0,
                subject=pitch["subject"],
                body_text=pitch["body_text"],
                hook_rationale=pitch["hook_rationale"],
                status="draft"
            )
            db.add(draft)
        else:
            if draft.status == "draft":
                draft.subject = pitch["subject"]
                draft.body_text = pitch["body_text"]
                draft.hook_rationale = pitch["hook_rationale"]

        researched_count += 1

    db.commit()
    return {
        "status": "success",
        "workspace_id": payload.workspace_id,
        "researched_count": researched_count
    }

@router.put("/{lead_id}/select-email")
def select_lead_email(lead_id: int, payload: SelectEmailRequest, db: Session = Depends(get_db)):
    """
    Updates the active work email for a lead and syncs all associated drafts.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.email = payload.email.strip().lower()
    lead.email_status = payload.status or "selected"
    db.commit()
    db.refresh(lead)

    return {
        "status": "success",
        "lead_id": lead.id,
        "selected_email": lead.email,
        "email_status": lead.email_status
    }

@router.get("/export/excel")
def export_leads_excel(workspace_id: int = 1, db: Session = Depends(get_db)):
    """
    Exports a multi-sheet Excel (.xlsx) file:
    Sheet 1: Leads & Details (with S.No)
    Sheet 2: Pitch Email Drafts (with S.No, Subject, and Body)
    """
    stream = ExportService.generate_excel_workbook(workspace_id=workspace_id, db=db)
    filename = "HackMyWebsite_Leads_and_Pitches.xlsx"
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/csv")
def export_leads_csv(workspace_id: int = 1, db: Session = Depends(get_db)):
    """
    Exports a CSV file of all leads and their primary pitch drafts with S.No.
    """
    leads = db.query(Lead).filter(Lead.workspace_id == workspace_id).order_by(Lead.id.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "S.No", "Lead ID", "Full Name", "First Name", "Last Name",
        "Job Title", "Company Name", "Inferred Domain", "Location",
        "LinkedIn URL", "Work Email", "Email Status",
        "Pitch Subject Line", "Pitch Email Body", "Strategy Angle"
    ]
    writer.writerow(headers)

    for idx, l in enumerate(leads, 1):
        draft = db.query(EmailDraft).filter(EmailDraft.lead_id == l.id, EmailDraft.step == 0).first()
        writer.writerow([
            idx,
            l.id,
            l.full_name,
            l.first_name,
            l.last_name,
            l.job_title,
            l.company_name,
            l.company_domain,
            ", ".join(filter(None, [l.city, l.state, l.country])),
            l.linkedin_url,
            l.email or "",
            l.email_status,
            draft.subject if draft else "",
            draft.body_text if draft else "",
            draft.hook_rationale if draft else ""
        ])

    output.seek(0)
    filename = "HackMyWebsite_Leads_and_Pitches.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


