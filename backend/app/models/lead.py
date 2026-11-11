from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    source = Column(String(64), default="clay")  # clay, csv, manual
    source_id = Column(String(128), nullable=True, index=True)  # e.g. clay row id
    
    # Contact Info
    first_name = Column(String(128), nullable=True)
    last_name = Column(String(128), nullable=True)
    full_name = Column(String(256), nullable=False)
    job_title = Column(String(256), nullable=True)
    company_name = Column(String(256), nullable=False, index=True)
    company_domain = Column(String(256), nullable=True, index=True)
    city = Column(String(128), nullable=True)
    state = Column(String(128), nullable=True)
    country = Column(String(128), nullable=True)
    linkedin_url = Column(String(512), nullable=True)
    
    # Best Verified Email
    email = Column(String(256), nullable=True, index=True)
    email_status = Column(String(64), default="unverified")  # unverified, valid, catch_all, invalid, timeout
    email_score = Column(Integer, default=0)  # 0 to 100
    
    # Enrichment metadata (LinkedIn summary, parsed tech stack, site vulnerabilities)
    enrichment_data = Column(Text, nullable=True)
    site_tech_stack = Column(Text, nullable=True)
    security_signals = Column(Text, nullable=True)
    
    # Outreach status
    outreach_status = Column(String(64), default="new")  # new, drafted, approved, day0_sent, day3_sent, day7_sent, replied, bounced, opted_out
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workspace = relationship("Workspace", back_populates="leads")
    candidates = relationship("EmailCandidate", back_populates="lead", cascade="all, delete-orphan")
    drafts = relationship("EmailDraft", back_populates="lead", cascade="all, delete-orphan")

class EmailCandidate(Base):
    __tablename__ = "email_candidates"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    email = Column(String(256), nullable=False, index=True)
    pattern = Column(String(64), nullable=True)  # e.g. first.last, f.last, first
    mx_found = Column(Boolean, default=False)
    mx_host = Column(String(256), nullable=True)
    smtp_code = Column(Integer, nullable=True)  # 250, 550, 451, etc.
    smtp_message = Column(String(512), nullable=True)
    is_catch_all = Column(Boolean, default=False)
    status = Column(String(64), default="untested")  # valid, invalid, catch_all, timeout, error
    tested_at = Column(DateTime, nullable=True)

    lead = relationship("Lead", back_populates="candidates")
