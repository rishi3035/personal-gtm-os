from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class EmailDraftBase(BaseModel):
    step: int = 0
    subject: str
    body_text: str
    body_html: Optional[str] = None
    hook_rationale: Optional[str] = None

class EmailDraftCreate(EmailDraftBase):
    workspace_id: int
    lead_id: int

class EmailDraftApproval(BaseModel):
    approved: bool
    approved_by: Optional[str] = "Rishikesh Raj"

class EmailDraftResponse(EmailDraftBase):
    id: int
    workspace_id: int
    lead_id: int
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
