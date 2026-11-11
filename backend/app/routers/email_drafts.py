from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.email import EmailDraft
from app.schemas.email import EmailDraftResponse, EmailDraftApproval
from app.services.mailer_service import MailerService

router = APIRouter(prefix="/api/drafts", tags=["Email Drafts & Approval"])

@router.get("", response_model=List[EmailDraftResponse])
def list_drafts(
    workspace_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(EmailDraft)
    if workspace_id:
        query = query.filter(EmailDraft.workspace_id == workspace_id)
    if lead_id:
        query = query.filter(EmailDraft.lead_id == lead_id)
    if status:
        query = query.filter(EmailDraft.status == status)
    return query.order_by(EmailDraft.id.desc()).offset(skip).limit(limit).all()

@router.put("/{draft_id}/approve")
def approve_draft(
    draft_id: int,
    approval: EmailDraftApproval,
    db: Session = Depends(get_db)
):
    """
    Human-in-the-loop review gate. Marks a draft as 'approved' or 'draft'.
    """
    draft = db.query(EmailDraft).filter(EmailDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if approval.approved:
        draft.status = "approved"
        draft.approved_by = approval.approved_by or "Rishikesh Raj"
        draft.approved_at = datetime.utcnow()
    else:
        draft.status = "draft"
        draft.approved_by = None
        draft.approved_at = None

    db.commit()
    db.refresh(draft)
    return {"status": "success", "draft_id": draft_id, "draft_status": draft.status}

@router.post("/{draft_id}/send")
def send_draft(draft_id: int, db: Session = Depends(get_db)):
    """
    Dispatches an approved email draft through configured SMTP.
    Rejects sending if not approved.
    """
    result = MailerService.send_approved_draft(draft_id, db)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result
