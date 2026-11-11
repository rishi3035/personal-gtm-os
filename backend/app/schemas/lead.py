from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel

class CandidateSchema(BaseModel):
    id: int
    email: str
    pattern: Optional[str] = None
    mx_found: bool = False
    mx_host: Optional[str] = None
    smtp_code: Optional[int] = None
    smtp_message: Optional[str] = None
    is_catch_all: bool = False
    status: str
    tested_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LeadBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: str
    job_title: Optional[str] = None
    company_name: str
    company_domain: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    email_status: Optional[str] = "unverified"
    email_score: Optional[int] = 0
    enrichment_data: Optional[str] = None
    site_tech_stack: Optional[str] = None
    security_signals: Optional[str] = None
    outreach_status: Optional[str] = "new"

class LeadCreate(LeadBase):
    workspace_id: int
    source: Optional[str] = "manual"
    source_id: Optional[str] = None

class LeadResponse(LeadBase):
    id: int
    workspace_id: int
    source: str
    source_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    candidates: List[CandidateSchema] = []

    class Config:
        from_attributes = True

class LeadStats(BaseModel):
    total_leads: int
    verified_emails: int
    unverified_emails: int
    drafted: int
    approved: int
    sent: int
    replied: int
