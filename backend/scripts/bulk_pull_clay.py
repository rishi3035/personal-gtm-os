import csv
import json
import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.core.database import SessionLocal
from app.models.lead import Lead, EmailCandidate
from app.models.workspace import Workspace
from app.services.clay_service import ClayService, clean_company_name_for_domain

def bulk_pull_all_clay_leads(table_id: str = "t_0tocbgtMEc9fyVheti6", workspace_id: int = 1):
    db = SessionLocal()
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        print(f"Error: Workspace {workspace_id} not found.")
        return

    print(f"Starting Bulk Pull for Clay Table: {table_id} -> Workspace: {ws.name}")
    
    # 1. Fetch column definitions
    cols_res = ClayService.list_columns(table_id)
    if "data" not in cols_res:
        print("Failed to fetch column metadata:", cols_res)
        return

    col_map = {c["id"]: c.get("name", "") for c in cols_res["data"]}
    print(f"Mapped {len(col_map)} columns from Clay table.")

    # 2. Paginated row fetch
    all_rows = []
    cursor = None
    page = 1
    limit = 100

    start_time = time.time()

    while True:
        print(f"Fetching page {page} (limit={limit}, cursor={'present' if cursor else 'none'})...")
        rows_res = ClayService.get_rows(table_id, limit=limit, cursor=cursor)
        
        if "data" not in rows_res:
            print("Finished or encountered error:", rows_res.get("error", "No data field"))
            break

        current_batch = rows_res.get("data", [])
        if not current_batch:
            print("No more rows returned.")
            break

        all_rows.extend(current_batch)
        print(f"  -> Page {page}: fetched {len(current_batch)} rows. Total so far: {len(all_rows)}")

        cursor = rows_res.get("cursor")
        if not cursor:
            print("No next cursor returned. Reached end of table.")
            break

        page += 1
        time.sleep(0.3)  # Polite pause between API calls

    total_pulled = len(all_rows)
    print(f"\nCompleted Clay fetch in {time.time() - start_time:.2f}s. Total rows: {total_pulled}")

    # 3. Process, upsert into SQLite, and prepare CSV data
    csv_records = []
    imported_count = 0
    updated_count = 0
    emails_found_count = 0

    for idx, row in enumerate(all_rows, 1):
        row_id = row.get("id")
        cells = row.get("cells", {})

        extracted = {}
        for col_id, cell in cells.items():
            col_name = col_map.get(col_id, col_id)
            if isinstance(cell, dict) and cell.get("status") == "success":
                extracted[col_name.lower().strip()] = cell.get("value")

        full_name = extracted.get("full name") or extracted.get("tech leaders, india, small companies") or ""
        first_name = extracted.get("first name") or ""
        last_name = extracted.get("last name") or ""
        job_title = extracted.get("job title") or ""
        company_name = extracted.get("company") or ""
        city = extracted.get("city") or ""
        state = extracted.get("state or province") or ""
        country = extracted.get("country") or "India"
        linkedin_url = extracted.get("linkedin profile") or ""
        
        # Check all possible work email columns
        work_email = extracted.get("work email") or extracted.get("work email (2)") or extracted.get("work email (3)") or ""
        if work_email and isinstance(work_email, str) and "@" in work_email:
            emails_found_count += 1
        else:
            work_email = ""

        if not full_name and not company_name:
            continue

        if not first_name and full_name:
            parts = full_name.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""

        inferred_domain = clean_company_name_for_domain(company_name)

        # Upsert in SQLite
        lead = db.query(Lead).filter(
            Lead.workspace_id == workspace_id,
            Lead.source_id == row_id
        ).first()

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
            db.flush()
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

        # Generate candidate permutations
        if inferred_domain and first_name:
            fn = "".join(filter(str.isalnum, first_name)).lower()
            ln = "".join(filter(str.isalnum, last_name)).lower() if last_name else ""
            permutations = []
            if fn and ln:
                permutations.append(f"{fn}.{ln}@{inferred_domain}")
                permutations.append(f"{fn[0]}{ln}@{inferred_domain}")
                permutations.append(f"{fn}@{inferred_domain}")
            elif fn:
                permutations.append(f"{fn}@{inferred_domain}")

            for cand_email in permutations:
                exists = db.query(EmailCandidate).filter(
                    EmailCandidate.lead_id == lead.id,
                    EmailCandidate.email == cand_email
                ).first()
                if not exists:
                    c = EmailCandidate(
                        lead_id=lead.id,
                        email=cand_email,
                        pattern="auto",
                        status="untested"
                    )
                    db.add(c)

        csv_records.append({
            "ID": idx,
            "Clay Row ID": row_id,
            "Full Name": full_name,
            "First Name": first_name,
            "Last Name": last_name,
            "Job Title": job_title,
            "Company": company_name,
            "Inferred Domain": inferred_domain,
            "Location": ", ".join(filter(None, [city, state, country])),
            "LinkedIn URL": linkedin_url,
            "Work Email": work_email,
        })

    db.commit()
    db.close()

    # 4. Export CSV to Downloads
    csv_path = Path("/Users/rishi/Downloads/HMW_Lead1_All_Clay_Leads.csv")
    fieldnames = [
        "ID", "Clay Row ID", "Full Name", "First Name", "Last Name",
        "Job Title", "Company", "Inferred Domain", "Location", "LinkedIn URL", "Work Email"
    ]
    with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_records)

    print(f"\n========================================================")
    print(f"Successfully processed {len(csv_records)} leads:")
    print(f" - Newly imported into SQLite: {imported_count}")
    print(f" - Existing records updated:   {updated_count}")
    print(f" - Direct emails from Clay:    {emails_found_count}")
    print(f" - CSV Export saved at:        {csv_path}")
    print(f"========================================================")

if __name__ == "__main__":
    bulk_pull_all_clay_leads()
