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
    """Get operational statistics for a specific workspace."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    total_leads = db.query(Lead).filter(Lead.workspace_id == workspace_id).count()
    verified_leads = db.query(Lead).filter(
        Lead.workspace_id == workspace_id,
        Lead.email_status.in_(["valid", "mx_verified"])
    ).count()
    
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
        "sent_emails": sent_drafts
    }
