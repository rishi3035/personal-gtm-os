from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.workspace import Workspace
from app.models.lead import Lead
from app.models.email import EmailDraft
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse

router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])

@router.get("", response_model=List[WorkspaceResponse])
def list_workspaces(db: Session = Depends(get_db)):
    """List all configured product workspaces."""
    return db.query(Workspace).order_by(Workspace.id.asc()).all()

@router.post("", response_model=WorkspaceResponse)
def create_workspace(workspace_in: WorkspaceCreate, db: Session = Depends(get_db)):
    """Create a new product workspace (e.g. HackMyWebsite, AiVi Campus OS)."""
    existing = db.query(Workspace).filter(Workspace.slug == workspace_in.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Workspace with slug '{workspace_in.slug}' already exists")
    
    ws = Workspace(**workspace_in.dict())
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws

@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(workspace_id: int, update_in: WorkspaceUpdate, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    for key, value in update_in.dict(exclude_unset=True).items():
        setattr(ws, key, value)
        
    db.commit()
    db.refresh(ws)
    return ws

@router.get("/{workspace_id}/stats")
def get_workspace_stats(workspace_id: int, db: Session = Depends(get_db)):
    """Get operational statistics and real-time revenue pipeline metrics for a specific workspace."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    total_leads = db.query(Lead).filter(Lead.workspace_id == workspace_id).count()
    verified_leads = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.email_status.in_(["valid", "mx_verified", "selected"])
    ).count()

    # Deal stage counts
    need_to_send_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status.in_(["need_to_send", "new"]) | (Lead.deal_status == None)
    ).count()

    sent_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status == "sent"
    ).count()

    in_discussion_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status == "in_discussion"
    ).count()

    won_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status == "won"
    ).count()

    said_no_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status == "said_no"
    ).count()

    active_leads_count = total_leads - said_no_count

    # Revenue calculations (Active leads only; excludes 'said_no')
    active_mrr = db.query(func.sum(Lead.plan_price_monthly)).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status != "said_no"
    ).scalar() or 0

    active_arr = db.query(func.sum(Lead.plan_price_annual)).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status != "said_no"
    ).scalar() or 0

    lost_mrr = db.query(func.sum(Lead.plan_price_monthly)).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status == "said_no"
    ).scalar() or 0

    lost_arr = db.query(func.sum(Lead.plan_price_annual)).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status == "said_no"
    ).scalar() or 0

    won_mrr = db.query(func.sum(Lead.plan_price_monthly)).filter(
        Lead.workspace_id == workspace_id,
        Lead.deal_status == "won"
    ).scalar() or 0

    # Plans breakdown across active leads
    agency_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.predicted_plan == "agency",
        Lead.deal_status != "said_no"
    ).count()
    agency_mrr = agency_count * 4999

    pro_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.predicted_plan == "pro",
        Lead.deal_status != "said_no"
    ).count()
    pro_mrr = pro_count * 2999

    starter_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.predicted_plan == "starter",
        Lead.deal_status != "said_no"
    ).count()
    starter_mrr = starter_count * 1999

    enterprise_count = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.predicted_plan == "enterprise",
        Lead.deal_status != "said_no"
    ).count()
    enterprise_mrr = enterprise_count * 9999

    drafts_count = db.query(EmailDraft).filter(EmailDraft.workspace_id == workspace_id).count()
    approved_drafts = db.query(EmailDraft).filter(
        EmailDraft.workspace_id == workspace_id,
        EmailDraft.status == "approved"
    ).count()
    sent_drafts = db.query(EmailDraft).filter(
        EmailDraft.workspace_id == workspace_id,
        EmailDraft.status == "sent"
    ).count()

    return {
        "workspace_id": workspace_id,
        "workspace_name": ws.name,
        "total_leads": total_leads,
        "verified_leads": verified_leads,
        "total_drafts": drafts_count,
        "approved_drafts": approved_drafts,
        "sent_emails": sent_drafts,
        # Real-time Dynamic Pipeline & Revenue Metrics
        "need_to_send_count": need_to_send_count,
        "sent_count": sent_count,
        "in_discussion_count": in_discussion_count,
        "won_count": won_count,
        "said_no_count": said_no_count,
        "active_leads_count": active_leads_count,
        "estimated_mrr_inr": active_mrr,
        "estimated_arr_inr": active_arr,
        "lost_mrr_inr": lost_mrr,
        "lost_arr_inr": lost_arr,
        "won_mrr_inr": won_mrr,
        "plans": {
            "agency": {"count": agency_count, "mrr": agency_mrr, "price": 4999},
            "pro": {"count": pro_count, "mrr": pro_mrr, "price": 2999},
            "starter": {"count": starter_count, "mrr": starter_mrr, "price": 1999},
            "enterprise": {"count": enterprise_count, "mrr": enterprise_mrr, "price": 9999}
        }
    }
