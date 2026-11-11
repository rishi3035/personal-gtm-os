from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base

class OperatorProfile(Base):
    __tablename__ = "operator_profiles"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(128), default="Rishikesh Raj")
    title = Column(String(256), default="Chief Operating Officer, AIVI Intelligence")
    linkedin_url = Column(String(512), nullable=True)
    headline = Column(Text, nullable=True)
    about = Column(Text, nullable=True)
    
    # Audit scoring
    readiness_score = Column(Integer, default=85)
    audit_notes = Column(Text, nullable=True)
    banner_suggestion = Column(Text, nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
