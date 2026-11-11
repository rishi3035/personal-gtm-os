import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session
from app.models.lead import Lead
from app.models.email import EmailDraft

class ExportService:
    @staticmethod
    def generate_excel_workbook(workspace_id: int, db: Session) -> io.BytesIO:
        """
        Generates a 2-sheet Excel (.xlsx) file:
        Sheet 1: 'Leads & Details' (S.No, Full Name, Title, Company, Domain, Location, LinkedIn, Work Email, Status)
        Sheet 2: 'Pitch Email Drafts' (S.No, Lead Name, Company, Work Email, Subject, Body, Strategy)
        """
        leads = db.query(Lead).filter(Lead.workspace_id == workspace_id).order_by(Lead.id.asc()).all()

        wb = openpyxl.Workbook()
        
        # Header styles
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid") # Dark slate
        regular_font = Font(name="Calibri", size=10)
        mono_font = Font(name="Consolas", size=9)
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        wrap_alignment = Alignment(wrap_text=True, vertical='top')
        top_alignment = Alignment(vertical='top')

        # ==========================================
        # Sheet 1: Leads & Details
        # ==========================================
        ws1 = wb.active
        ws1.title = "Leads & Details"

        headers_sheet1 = [
            "S.No", "Lead ID", "Full Name", "First Name", "Last Name",
            "Job Title", "Company Name", "Inferred Domain", "Location",
            "LinkedIn Profile URL", "Work Email", "Email Status", "Candidate Count"
        ]

        ws1.append(headers_sheet1)
        for col_num in range(1, len(headers_sheet1) + 1):
            cell = ws1.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        ws1.row_dimensions[1].height = 26

        for idx, l in enumerate(leads, 1):
            row_data = [
                idx,
                l.id,
                l.full_name,
                l.first_name,
                l.last_name,
                l.job_title,
                l.company_name,
                l.company_domain,
                ", ".join(filter(None, [l.city, l.state, l.country])),
                l.linkedin_url,
                l.email or "",
                l.email_status,
                len(l.candidates)
            ]
            ws1.append(row_data)
            row_idx = idx + 1
            ws1.row_dimensions[row_idx].height = 20

            for col_idx in range(1, len(row_data) + 1):
                c = ws1.cell(row=row_idx, column=col_idx)
                c.font = regular_font
                c.border = thin_border
                c.alignment = top_alignment
                if col_idx == 1:
                    c.alignment = Alignment(horizontal="center", vertical="top")
                elif col_idx in (8, 11): # domain, email
                    c.font = mono_font

        # Auto-fit columns Sheet 1
        for col in ws1.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws1.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 45)

        # ==========================================
        # Sheet 2: Pitch Email Drafts
        # ==========================================
        ws2 = wb.create_sheet(title="Pitch Email Drafts")

        headers_sheet2 = [
            "S.No", "Lead Name", "Job Title", "Company Name", "Target Domain",
            "Work Email", "Email Status", "Pitch Subject Line", "Pitch Email Body",
            "Hook Strategy / Angle", "Draft Status"
        ]

        ws2.append(headers_sheet2)
        for col_num in range(1, len(headers_sheet2) + 1):
            cell = ws2.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        ws2.row_dimensions[1].height = 26

        for idx, l in enumerate(leads, 1):
            draft = db.query(EmailDraft).filter(EmailDraft.lead_id == l.id, EmailDraft.step == 0).first()
            subject = draft.subject if draft else ""
            body = draft.body_text if draft else ""
            rationale = draft.hook_rationale if draft else ""
            status = draft.status if draft else "draft"

            row_data = [
                idx,
                l.full_name,
                l.job_title,
                l.company_name,
                l.company_domain,
                l.email or "",
                l.email_status,
                subject,
                body,
                rationale,
                status
            ]
            ws2.append(row_data)
            row_idx = idx + 1
            ws2.row_dimensions[row_idx].height = 65  # Room for multi-line body snippet

            for col_idx in range(1, len(row_data) + 1):
                c = ws2.cell(row=row_idx, column=col_idx)
                c.font = regular_font
                c.border = thin_border
                c.alignment = top_alignment
                if col_idx == 1:
                    c.alignment = Alignment(horizontal="center", vertical="top")
                elif col_idx in (8, 9): # subject, body
                    c.alignment = wrap_alignment
                elif col_idx in (5, 6): # domain, email
                    c.font = mono_font

        # Auto-fit columns Sheet 2
        for col in ws2.columns:
            col_letter = get_column_letter(col[0].column)
            col_num = col[0].column
            if col_num == 9: # Body text
                ws2.column_dimensions[col_letter].width = 65
            elif col_num == 8: # Subject line
                ws2.column_dimensions[col_letter].width = 40
            else:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws2.column_dimensions[col_letter].width = min(max(max_len + 3, 10), 35)

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream
