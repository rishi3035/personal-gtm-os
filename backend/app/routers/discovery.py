import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.lead import Lead
from app.services.sovereign_lead_generator import SovereignLeadGenerator

logger = logging.getLogger("discovery_router")
router = APIRouter(prefix="/api/discovery", tags=["Discovery"])

class GenerateLeadsRequest(BaseModel):
    city: str = Field(default="Bengaluru", description="Target city in India")
    niche: str = Field(default="web development agency", description="Target industry niche")
    count: int = Field(default=25, ge=1, le=100, description="Target number of net-new leads to generate")
    workspace_id: int = Field(default=1, description="Active workspace ID")

class BatchEnrichPhonesRequest(BaseModel):
    limit: int = Field(default=25, ge=1, le=100, description="Number of leads to enrich with phone/WhatsApp")

@router.post("/generate-leads")
async def generate_leads(
    req: GenerateLeadsRequest,
    db: Session = Depends(get_db)
):
    """
    Autonomous Sovereign Lead Sourcing & Ingestion Sprint:
    1. Discovers clean agency domains using polite dorks and OSM Overpass.
    2. Enforces multi-tier deduplication against gtm.db.
    3. Profiles tech stack and extracts executive leadership.
    4. Derives emails and validates MX records.
    5. Extracts direct WhatsApp and phone numbers.
    6. Ingests net-new leads into SQLite gtm.db under HackMyWebsite.
    """
    try:
        logger.info("Starting autonomous sourcing run for city=%s, niche=%s, target=%d", req.city, req.niche, req.count)
        result = await SovereignLeadGenerator.generate_and_ingest_leads(
            db=db,
            workspace_id=req.workspace_id,
            city=req.city,
            niche=req.niche,
            target_count=req.count
        )
        return result
    except Exception as e:
        logger.exception("Lead generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-enrich-phones")
async def batch_enrich_phones(
    req: BatchEnrichPhonesRequest,
    db: Session = Depends(get_db)
):
    """
    Batch sovereign phone & WhatsApp enrichment for existing leads in gtm.db missing phone numbers.
    """
    try:
        result = await SovereignLeadGenerator.batch_enrich_existing_leads(db=db, limit=req.limit)
        return result
    except Exception as e:
        logger.exception("Batch phone enrichment failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
def get_discovery_stats(db: Session = Depends(get_db)):
    """
    Returns live database coverage metrics:
    - Total leads
    - Leads with verified emails
    - Leads with extracted phone/WhatsApp
    - Phone extraction fill rate
    """
    total = db.query(func.count(Lead.id)).scalar() or 0
    with_email = db.query(func.count(Lead.id)).filter(Lead.email.isnot(None), Lead.email != "").scalar() or 0
    with_phone = db.query(func.count(Lead.id)).filter(Lead.phone.isnot(None), Lead.phone != "").scalar() or 0

    fill_rate = round((with_phone / total * 100), 1) if total > 0 else 0.0

    return {
        "total_leads": total,
        "leads_with_email": with_email,
        "leads_with_phone": with_phone,
        "phone_fill_rate_pct": fill_rate
    }
