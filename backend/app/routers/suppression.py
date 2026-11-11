from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.suppression import SuppressedContact

router = APIRouter(prefix="/api/suppression", tags=["Suppression List"])

class SuppressionCreate(BaseModel):
    email: str
    reason: Optional[str] = "manual"

@router.get("")
def list_suppression(db: Session = Depends(get_db)):
    return db.query(SuppressedContact).order_by(SuppressedContact.id.desc()).all()

@router.post("")
def add_suppression(payload: SuppressionCreate, db: Session = Depends(get_db)):
    norm_email = payload.email.strip().lower()
    domain = norm_email.split("@")[-1] if "@" in norm_email else None
    
    existing = db.query(SuppressedContact).filter(SuppressedContact.email == norm_email).first()
    if existing:
        return {"status": "already_exists", "email": norm_email}

    suppressed = SuppressedContact(
        email=norm_email,
        domain=domain,
        reason=payload.reason
    )
    db.add(suppressed)
    db.commit()
    return {"status": "success", "email": norm_email}

@router.delete("/{suppression_id}")
def delete_suppression(suppression_id: int, db: Session = Depends(get_db)):
    s = db.query(SuppressedContact).filter(SuppressedContact.id == suppression_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(s)
    db.commit()
    return {"status": "success", "message": "Removed from suppression list"}
