import json
import re
import subprocess
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.lead import Lead, EmailCandidate
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)

def clean_company_name_for_domain(company_name: str) -> str:
    """Derive a probable domain slug from a company name."""
    if not company_name:
        return ""
    # Remove common corporate suffixes
    name = re.sub(r'(?i)\b(private limited|pvt ltd|ltd|llc|inc|corp|co|gmbh|solutions|technologies|infotech)\b', '', company_name)
    name = re.sub(r'[^a-zA-Z0-9]', '', name).lower()
    return f"{name}.com" if name else ""

class ClayService:
    @staticmethod
    def run_cli_command(args: List[str]) -> Dict[str, Any]:
        """
        STRICT CREDIT PROTECTION BARRIER:
        Clay CLI calls are hard-disabled to guarantee ZERO credit consumption.
        The operating system operates 100% sovereignly with zero third-party dependencies.
        """
        logger.warning(f"Blocked Clay CLI execution ({args}) to protect user credits. Sovereign mode active.")
        return {
            "status": "blocked",
            "message": "Clay CLI integration is permanently disabled to protect user account credits. Use 100% sovereign research endpoints."
        }

    @classmethod
    def list_tables(cls) -> Dict[str, Any]:
        """List all tables in the Clay workspace."""
        return cls.run_cli_command(["tables", "list"])

    @classmethod
    def list_columns(cls, table_id: str) -> Dict[str, Any]:
        """List columns of a specific Clay table."""
        return cls.run_cli_command(["tables", "columns", "list", table_id])

    @classmethod
    def get_rows(cls, table_id: str, limit: int = 50, cursor: Optional[str] = None) -> Dict[str, Any]:
        """Fetch rows from a Clay table."""
        args = ["tables", "rows", "list", table_id, "--limit", str(limit)]
        if cursor:
            args.extend(["--cursor", cursor])
        return cls.run_cli_command(args)

    @classmethod
    def import_table_leads(
        cls,
        table_id: str,
        workspace_id: int,
        limit: int = 50,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Fetch rows from a Clay table and ingest them as Leads in the SQLite database.
        Extracts contact details and populates initial candidate email permutations.
        """
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            return {"status": "error", "message": f"Workspace {workspace_id} not found"}

        # 1. Fetch column definitions to map column IDs to readable names
        cols_res = cls.list_columns(table_id)
        if "data" not in cols_res:
            return {"status": "error", "message": "Failed to read table columns", "details": cols_res}

        col_id_to_name = {c["id"]: c.get("name", "") for c in cols_res["data"]}

        # 2. Fetch rows
        rows_res = cls.get_rows(table_id, limit=limit)
        if "data" not in rows_res:
            return {"status": "error", "message": "Failed to read table rows", "details": rows_res}

        imported_count = 0
        updated_count = 0

        for row in rows_res.get("data", []):
            row_id = row.get("id")
            cells = row.get("cells", {})

            # Map cell values by column name
            extracted: Dict[str, Any] = {}
            for col_id, cell_data in cells.items():
                col_name = col_id_to_name.get(col_id, col_id)
                if isinstance(cell_data, dict) and cell_data.get("status") == "success":
                    extracted[col_name.lower().strip()] = cell_data.get("value")

            full_name = extracted.get("full name") or extracted.get("tech leaders, india, small companies") or ""
            first_name = extracted.get("first name") or ""
            last_name = extracted.get("last name") or ""
            job_title = extracted.get("job title") or ""
            company_name = extracted.get("company") or ""
            city = extracted.get("city") or ""
            state = extracted.get("state or province") or ""
            country = extracted.get("country") or "India"
            linkedin_url = extracted.get("linkedin profile") or ""
            work_email = extracted.get("work email") or ""

            if not full_name and not company_name:
                continue

            if not first_name and full_name:
                parts = full_name.split(" ", 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ""

            # Check if lead already exists in this workspace
            lead = db.query(Lead).filter(
                Lead.workspace_id == workspace_id,
                Lead.source_id == row_id
            ).first()

            inferred_domain = clean_company_name_for_domain(company_name)

            if not lead:
                lead = Lead(
                    workspace_id=workspace_id,
                    source="clay",
                    source_id=row_id,
                    first_name=first_name,
                    last_name=last_name,
                    full_name=full_name or f"{first_name} {last_name}".strip(),
                    job_title=job_title,
                    company_name=company_name,
                    company_domain=inferred_domain,
                    city=city,
                    state=state,
                    country=country,
                    linkedin_url=linkedin_url,
                    email=work_email if work_email else None,
                    email_status="valid" if work_email else "unverified",
                    outreach_status="new"
                )
                db.add(lead)
                db.flush()  # get lead.id
                imported_count += 1
            else:
                lead.job_title = job_title or lead.job_title
                lead.city = city or lead.city
                lead.state = state or lead.state
                lead.linkedin_url = linkedin_url or lead.linkedin_url
                if work_email and not lead.email:
                    lead.email = work_email
                    lead.email_status = "valid"
                updated_count += 1

            # Generate candidate email permutations if we have a domain and first/last name
            if inferred_domain and first_name:
                fn = re.sub(r'[^a-zA-Z0-9]', '', first_name).lower()
                ln = re.sub(r'[^a-zA-Z0-9]', '', last_name).lower() if last_name else ""
                
                permutations = []
                if fn and ln:
                    permutations.append((f"{fn}.{ln}@{inferred_domain}", "first.last"))
                    permutations.append((f"{fn[0]}{ln}@{inferred_domain}", "f.last"))
                    permutations.append((f"{fn}@{inferred_domain}", "first"))
                    permutations.append((f"{fn}_{ln}@{inferred_domain}", "first_last"))
                elif fn:
                    permutations.append((f"{fn}@{inferred_domain}", "first"))

                for email_candidate, pattern in permutations:
                    exists = db.query(EmailCandidate).filter(
                        EmailCandidate.lead_id == lead.id,
                        EmailCandidate.email == email_candidate
                    ).first()
                    if not exists:
                        cand = EmailCandidate(
                            lead_id=lead.id,
                            email=email_candidate,
                            pattern=pattern,
                            status="untested"
                        )
                        db.add(cand)

        db.commit()
        return {
            "status": "success",
            "imported": imported_count,
            "updated": updated_count,
            "table_id": table_id,
            "workspace_id": workspace_id,
            "cursor": rows_res.get("cursor")
        }
