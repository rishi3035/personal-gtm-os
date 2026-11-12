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
    phone: Optional[str] = None
    email: Optional[str] = None
    email_status: Optional[str] = "unverified"
    email_score: Optional[int] = 0
    enrichment_data: Optional[str] = None
    site_tech_stack: Optional[str] = None
    security_signals: Optional[str] = None
    outreach_status: Optional[str] = "new"
    predicted_plan: Optional[str] = "agency"
    plan_price_monthly: Optional[int] = 4999
    plan_price_annual: Optional[int] = 59988
    deal_status: Optional[str] = "need_to_send"
    deal_notes: Optional[str] = None

class UpdateDealStatusRequest(BaseModel):
    deal_status: str  # need_to_send, sent, in_discussion, won, said_no
    predicted_plan: Optional[str] = None  # agency, pro, starter, enterprise
    deal_notes: Optional[str] = None

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

class SovereignLookupRequest(BaseModel):
    domain: str
    company_name: Optional[str] = None
    contact_name: Optional[str] = None

class AutonomousLeadGenRequest(BaseModel):
    niche: Optional[str] = "D2C Brands"
    company_type: Optional[str] = "All"  # All, D2C, SaaS, B2B, B2C, Agency
    geography: Optional[str] = "Bengaluru"
    headcount: Optional[str] = "11-50"  # 1-10, 11-50, 51-200, 201-1000
    target_roles: Optional[List[str]] = ["Founder", "CEO", "CTO", "COO"]
    count: Optional[int] = 10
    workspace_id: Optional[int] = 1

class LeadStats(BaseModel):
    total_leads: int
    verified_emails: int
    unverified_emails: int
    drafted: int
    approved: int
    sent: int
    replied: int
