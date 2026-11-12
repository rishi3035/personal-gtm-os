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
from app.schemas.lead import (
    LeadResponse, LeadCreate, LeadStats, UpdateDealStatusRequest,
    SovereignLookupRequest, AutonomousLeadGenRequest
)
from app.services.sovereign_enrichment_service import SovereignEnrichmentService
from app.services.sovereign_lead_generator import SovereignLeadGenerator

PLAN_PRICES = {
    "agency": {"monthly": 4999, "annual": 59988, "name": "Agency Tier"},
    "pro": {"monthly": 2999, "annual": 35988, "name": "Pro Tier"},
    "starter": {"monthly": 1999, "annual": 23988, "name": "Starter Tier"},
    "enterprise": {"monthly": 9999, "annual": 119988, "name": "Agency Enterprise"}
}
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
    limit: int = Query(1000, ge=1, le=2000),
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
    return query.order_by(Lead.id.asc()).offset(skip).limit(limit).all()

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

    # Strict Zero Bluff Policy: Only promote if truly verified via RFC 5321 250 OK (score >= 90)
    if best_candidate and highest_score >= 90:
        lead.email = best_candidate.email
        lead.email_status = "verified"
        lead.email_score = highest_score
    elif not lead.email_status or lead.email_status in ("candidate", "untested"):
        lead.email = None
        lead.email_status = "unverified"
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

@router.post("/{lead_id}/waterfall-enrich")
def waterfall_enrich_lead(lead_id: int, db: Session = Depends(get_db)):
    """
    Executes real multi-vendor waterfall enrichment:
    Clay Routine Cascade (Findymail, Dropcontact, Hunter, Prospeo, etc.) -> Sovereign Site Recon -> Zero Bluff Verification.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    from app.services.waterfall_enrichment_service import WaterfallEnrichmentService
    res = WaterfallEnrichmentService.enrich_lead_waterfall(lead=lead, db=db)
    return res

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
        },
        "sequence": result.get("sequence", {})
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

@router.put("/{lead_id}/deal-status")
def update_lead_deal_status(lead_id: int, payload: UpdateDealStatusRequest, db: Session = Depends(get_db)):
    """
    Updates a lead's pipeline deal stage and predicted plan tier.
    If deal_status is set to 'said_no', this lead is marked as passed/lost and
    their estimated revenue will immediately decrease on the dashboard.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_status = lead.deal_status
    old_mrr = lead.plan_price_monthly or 4999

    # Update plan tier if provided
    if payload.predicted_plan:
        plan_key = payload.predicted_plan.lower()
        if plan_key in PLAN_PRICES:
            lead.predicted_plan = plan_key
            lead.plan_price_monthly = PLAN_PRICES[plan_key]["monthly"]
            lead.plan_price_annual = PLAN_PRICES[plan_key]["annual"]

    lead.deal_status = payload.deal_status.lower()
    if payload.deal_notes:
        lead.deal_notes = payload.deal_notes

    if payload.deal_status == "said_no":
        lead.outreach_status = "rejected"
    elif payload.deal_status == "won":
        lead.outreach_status = "replied"
    elif payload.deal_status == "sent":
        lead.outreach_status = "day0_sent"

    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)

    return {
        "status": "success",
        "lead_id": lead.id,
        "company_name": lead.company_name,
        "predicted_plan": lead.predicted_plan,
        "plan_price_monthly": lead.plan_price_monthly,
        "plan_price_annual": lead.plan_price_annual,
        "deal_status": lead.deal_status,
        "previous_status": old_status,
        "mrr_delta": 0 if old_status == "said_no" and lead.deal_status == "said_no" else (
            -lead.plan_price_monthly if lead.deal_status == "said_no" else (
                lead.plan_price_monthly if old_status == "said_no" else 0
            )
        )
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
        "Predicted Plan (hackmywebsite.io)", "Est. MRR (INR)", "Pipeline Deal Status",
        "Pitch Subject Line", "Pitch Email Body", "Strategy Angle"
    ]
    writer.writerow(headers)

    for idx, l in enumerate(leads, 1):
        draft = db.query(EmailDraft).filter(EmailDraft.lead_id == l.id, EmailDraft.step == 0).first()
        is_said_no = l.deal_status == "said_no"
        mrr_val = 0 if is_said_no else (l.plan_price_monthly or 4999)

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
            (l.predicted_plan or "agency").upper(),
            mrr_val,
            (l.deal_status or "need_to_send").replace("_", " ").upper(),
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

@router.post("/sovereign-lookup")
async def sovereign_lookup(payload: SovereignLookupRequest):
    """
    Sovereign, 100% Free Lead & Phone Enrichment.
    Zero third-party SaaS dependency (no Apollo, no Clay, no Hunter).
    Extracts direct founder WhatsApp numbers, tel: anchors, and corporate contact details.
    """
    result = await SovereignEnrichmentService.enrich_lead(
        domain=payload.domain,
        company_name=payload.company_name or "",
        contact_name=payload.contact_name or ""
    )
    return {
        "status": "success",
        "enrichment": result
    }

@router.post("/{lead_id}/sovereign-enrich")
async def sovereign_enrich_lead(lead_id: int, db: Session = Depends(get_db)):
    """
    Auto-enriches an existing lead in the database using the sovereign zero-cost engine.
    If a verified phone or WhatsApp number is found, it automatically saves to SQLite.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    result = await SovereignEnrichmentService.enrich_lead(
        domain=lead.company_domain or "",
        company_name=lead.company_name or "",
        contact_name=lead.full_name or ""
    )

    if result.get("primary_phone"):
        lead.phone = result["primary_phone"]

    # Update enrichment data
    try:
        current_data = json.loads(lead.enrichment_data) if lead.enrichment_data else {}
    except Exception:
        current_data = {}

    current_data["sovereign_phone_enrichment"] = {
        "phone": result.get("primary_phone"),
        "phone_type": result.get("phone_type"),
        "whatsapp_link": result.get("whatsapp_link"),
        "confidence": result.get("confidence_score"),
        "source": result.get("source"),
        "all_phones": [p.get("formatted") for p in result.get("all_phones", [])],
        "findings": result.get("findings", [])
    }
    lead.enrichment_data = json.dumps(current_data, ensure_ascii=False)
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)

    return {
        "status": "success",
        "lead_id": lead.id,
        "full_name": lead.full_name,
        "company_name": lead.company_name,
        "phone": lead.phone,
        "enrichment": result
    }

@router.post("/generate-autonomous")
async def generate_autonomous_leads(
    payload: AutonomousLeadGenRequest,
    db: Session = Depends(get_db)
):
    """
    Stage 2 Sovereign Lead Operations.
    Performs autonomous live web search, profiles target niche accounts,
    extracts C-Suite leadership (Founder, Co-Founder, CTO, COO),
    validates deliverable mailboxes via DNS MX, generates bespoke pitches,
    and ingests directly into gtm.db.
    100% Free • Zero third-party SaaS dependency.
    """
    result = await SovereignLeadGenerator.run_autonomous_stage2_pipeline(
        db=db,
        niche=payload.niche or "D2C Brands",
        company_type=payload.company_type or "All",
        geography=payload.geography or "Bengaluru",
        headcount=payload.headcount or "11-50",
        target_roles=payload.target_roles or ["Founder", "CEO", "CTO", "COO"],
        count=payload.count or 10,
        workspace_id=payload.workspace_id or 1
    )
    return result




