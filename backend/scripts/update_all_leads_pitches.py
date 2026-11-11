import json
import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.core.database import SessionLocal
from app.models.lead import Lead
from app.models.workspace import Workspace
from app.models.email import EmailDraft
from app.services.research_pitch_service import ResearchPitchService

def update_all_leads_with_chat_strategy(workspace_id: int = 1):
    db = SessionLocal()
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        print(f"Error: Workspace {workspace_id} not found.")
        return

    leads = db.query(Lead).filter(Lead.workspace_id == workspace_id).all()
    total = len(leads)
    print(f"Updating personalized emails for all {total} leads in workspace '{ws.name}'...")
    print("Using proven 6-block architecture from chat session 0f9221c6-4e53-46d6-8cde-c1787c0be2b9...")

    start_time = time.time()
    updated_count = 0

    for idx, lead in enumerate(leads, 1):
        res = ResearchPitchService.generate_research_pitch(lead, ws)
        dossier = res["dossier"]
        pitch = res["pitch_email"]

        # Update lead research dossier
        lead.enrichment_data = json.dumps(dossier, ensure_ascii=False)
        lead.outreach_status = "drafted"

        # Find or create step 0 draft
        draft = db.query(EmailDraft).filter(
            EmailDraft.lead_id == lead.id,
            EmailDraft.step == 0
        ).first()

        if not draft:
            draft = EmailDraft(
                workspace_id=ws.id,
                lead_id=lead.id,
                step=0,
                subject=pitch["subject"],
                body_text=pitch["body_text"],
                hook_rationale=pitch["hook_rationale"],
                status="draft"
            )
            db.add(draft)
        else:
            draft.subject = pitch["subject"]
            draft.body_text = pitch["body_text"]
            draft.hook_rationale = pitch["hook_rationale"]

        updated_count += 1
        if idx % 100 == 0 or idx == total:
            print(f"  Processed {idx}/{total} leads...")

    db.commit()
    db.close()

    duration = time.time() - start_time
    print("\n========================================================")
    print(f"Successfully updated all {updated_count} leads in {duration:.2f} seconds!")
    print(f"Every lead now has a bespoke Subject Line, Research Dossier, and Body Text.")
    print("========================================================")

if __name__ == "__main__":
    update_all_leads_with_chat_strategy()
