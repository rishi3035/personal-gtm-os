from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.operator import OperatorProfile

router = APIRouter(prefix="/api/operator", tags=["Operator Profile Studio"])

class OperatorUpdate(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None
    linkedin_url: Optional[str] = None
    headline: Optional[str] = None
    about: Optional[str] = None

@router.get("")
def get_operator_profile(db: Session = Depends(get_db)):
    profile = db.query(OperatorProfile).first()
    if not profile:
        profile = OperatorProfile(
            full_name="Rishikesh Raj",
            title="Chief Operating Officer, AIVI Intelligence",
            linkedin_url="https://www.linkedin.com/in/rishi-raj/",
            headline="COO @ AIVI Intelligence | Scaling AiVi Campus OS & Hack My Website | Building Autonomous Systems",
            about=(
                "Leading operations and product execution at AIVI Intelligence Private Limited. "
                "Pioneering autonomous intelligence systems, real-time telemetry, and enterprise DevSecOps automation."
            ),
            readiness_score=88,
            audit_notes=(
                "Strong executive positioning. Banner matches DevSecOps & AI telemetry theme. "
                "Recommendations: Link HackMyWebsite live demo and post recent DevSecOps case study."
            ),
            banner_suggestion="Dark mode minimal design with AIVI Intelligence & HackMyWebsite verified badge"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("")
def update_operator_profile(payload: OperatorUpdate, db: Session = Depends(get_db)):
    profile = db.query(OperatorProfile).first()
    if not profile:
        profile = OperatorProfile()
        db.add(profile)

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(profile, k, v)

    db.commit()
    db.refresh(profile)
    return profile
