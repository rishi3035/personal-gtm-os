from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    domain = Column(String(256), nullable=False)
    tagline = Column(String(256), nullable=True)
    target_audience = Column(String(512), nullable=True)
    value_prop = Column(Text, nullable=True)
    pain_points = Column(Text, nullable=True)  # JSON or newline-separated
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    leads = relationship("Lead", back_populates="workspace", cascade="all, delete-orphan")
    drafts = relationship("EmailDraft", back_populates="workspace", cascade="all, delete-orphan")
