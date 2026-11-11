import shutil
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings, DATA_DIR

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint validating API and SQLite connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {e}"

    disk_usage = shutil.disk_usage(DATA_DIR)
    free_gb = round(disk_usage.free / (1024 ** 3), 2)

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "storage_free_gb": free_gb,
        "clay_cli_configured": bool(settings.CLAY_CLI_PATH)
    }
