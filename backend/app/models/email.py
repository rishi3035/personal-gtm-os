from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class EmailDraft(Base):
    __tablename__ = "email_drafts"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    
    # Step: 0 = Day 0 (Initial), 1 = Day 3 (Value Add), 2 = Day 7 (Breakup / Final)
    step = Column(Integer, default=0)
    
    subject = Column(String(256), nullable=False)
    body_text = Column(Text, nullable=False)
    body_html = Column(Text, nullable=True)
    hook_rationale = Column(Text, nullable=True)  # Explain why this hook was generated
    
    # Status: draft, approved, sending, sent, failed, cancelled
    status = Column(String(64), default="draft")
    
    # Human-in-the-loop review
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Outbound tracking
    message_id = Column(String(256), nullable=True)
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workspace = relationship("Workspace", back_populates="drafts")
    lead = relationship("Lead", back_populates="drafts")
