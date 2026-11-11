from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base

class SuppressedContact(Base):
    __tablename__ = "suppression_list"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(256), unique=True, index=True, nullable=False)
    domain = Column(String(256), nullable=True, index=True)
    reason = Column(String(128), default="opt_out")  # opt_out, bounce, manual, replied_negative
    suppressed_at = Column(DateTime, default=datetime.utcnow)
