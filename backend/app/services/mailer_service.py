import smtplib
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.email import EmailDraft
from app.models.lead import Lead
from app.models.suppression import SuppressedContact

logger = logging.getLogger(__name__)

class MailerService:
    @staticmethod
    def is_suppressed(email: str, db: Session) -> bool:
        """Check if an email or domain is on the suppression list."""
        if not email:
            return True
        norm_email = email.strip().lower()
        domain = norm_email.split("@")[-1] if "@" in norm_email else ""
        
        # Check email match
        match = db.query(SuppressedContact).filter(
            (SuppressedContact.email == norm_email) | (SuppressedContact.domain == domain)
        ).first()
        return match is not None

    @classmethod
    def send_approved_draft(
        cls,
        draft_id: int,
        db: Session,
        override_smtp: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Dispatches an approved email draft through configured SMTP credentials.
        STRICTLY requires draft.status == 'approved'. Rejects unapproved drafts.
        """
        draft = db.query(EmailDraft).filter(EmailDraft.id == draft_id).first()
        if not draft:
            return {"status": "error", "message": f"Draft {draft_id} not found"}

        if draft.status != "approved":
            return {
                "status": "error",
                "message": f"Security restriction: Draft {draft_id} is '{draft.status}'. Only 'approved' drafts can be sent."
            }

        lead = db.query(Lead).filter(Lead.id == draft.lead_id).first()
        if not lead or not lead.email:
            draft.status = "failed"
            draft.error_message = "Lead has no recipient email address"
            db.commit()
            return {"status": "error", "message": draft.error_message}

        recipient_email = lead.email.strip().lower()

        # Check suppression
        if cls.is_suppressed(recipient_email, db):
            draft.status = "cancelled"
            draft.error_message = f"Recipient {recipient_email} is on the suppression list."
            db.commit()
            return {"status": "error", "message": draft.error_message}

        # Resolve SMTP configuration
        smtp_host = (override_smtp or {}).get("host") or settings.SMTP_HOST
        smtp_port = (override_smtp or {}).get("port") or settings.SMTP_PORT
        smtp_user = (override_smtp or {}).get("username") or settings.SMTP_USERNAME
        smtp_pass = (override_smtp or {}).get("password") or settings.SMTP_PASSWORD
        from_email = (override_smtp or {}).get("from_email") or settings.SMTP_FROM_EMAIL
        from_name = (override_smtp or {}).get("from_name") or settings.SMTP_FROM_NAME

        if not smtp_user or not smtp_pass:
            return {
                "status": "dry_run",
                "message": "SMTP credentials not provided. Draft remains approved. Configure SMTP in settings to dispatch.",
                "recipient": recipient_email,
                "subject": draft.subject
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = draft.subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = recipient_email
            
            # Plain text body with polite unsubscribe line
            full_body = (
                f"{draft.body_text}\n\n"
                f"---\n"
                f"If you'd prefer not to receive updates from us, reply with 'unsubscribe' and we will remove your contact instantly."
            )
            msg.attach(MIMEText(full_body, "plain"))

            # Send via smtplib
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_email, [recipient_email], msg.as_string())

            # Update statuses
            draft.status = "sent"
            draft.sent_at = datetime.utcnow()
            
            step_to_status = {
                0: "day0_sent",
                1: "day3_sent",
                2: "day7_sent"
            }
            lead.outreach_status = step_to_status.get(draft.step, "sent")
            db.commit()

            return {
                "status": "success",
                "message": f"Email successfully dispatched to {recipient_email}",
                "sent_at": draft.sent_at.isoformat()
            }

        except Exception as e:
            logger.exception("Failed to send email")
            draft.status = "failed"
            draft.error_message = str(e)
            db.commit()
            return {"status": "error", "message": f"SMTP dispatch failed: {e}"}
