from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.clay_service import ClayService

router = APIRouter(prefix="/api/clay", tags=["Clay Integration"])

class ClayImportRequest(BaseModel):
    table_id: str
    workspace_id: int
    limit: int = 50

@router.get("/tables")
def get_clay_tables():
    """List all Clay tables available in the current workspace."""
    res = ClayService.list_tables()
    if "error" in res:
        raise HTTPException(status_code=500, detail=res["error"])
    return res

@router.get("/tables/{table_id}/columns")
def get_clay_table_columns(table_id: str):
    """List columns for a specific Clay table."""
    res = ClayService.list_columns(table_id)
    if "error" in res:
        raise HTTPException(status_code=500, detail=res["error"])
    return res

@router.get("/tables/{table_id}/rows")
def get_clay_table_rows(
    table_id: str,
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = None
):
    """Fetch paginated rows from a Clay table."""
    res = ClayService.get_rows(table_id, limit=limit, cursor=cursor)
    if "error" in res:
        raise HTTPException(status_code=500, detail=res["error"])
    return res

@router.post("/import")
def import_clay_leads(payload: ClayImportRequest, db: Session = Depends(get_db)):
    """Import leads from a Clay table into the designated product workspace."""
    result = ClayService.import_table_leads(
        table_id=payload.table_id,
        workspace_id=payload.workspace_id,
        limit=payload.limit,
        db=db
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result
