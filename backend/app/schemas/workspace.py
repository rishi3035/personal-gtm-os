from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class WorkspaceBase(BaseModel):
    slug: str
    name: str
    domain: str
    tagline: Optional[str] = None
    target_audience: Optional[str] = None
    value_prop: Optional[str] = None
    pain_points: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    tagline: Optional[str] = None
    target_audience: Optional[str] = None
    value_prop: Optional[str] = None
    pain_points: Optional[str] = None
    is_active: Optional[bool] = None

class WorkspaceResponse(WorkspaceBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
