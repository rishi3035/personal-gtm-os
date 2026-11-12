import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Don't draw running header on cover/first page
        if self._pageNumber > 1:
            # Running Header
            self.drawString(36, 762, "AIVI GTM OPERATING SYSTEM (AIVI GTM OS)")
            self.drawRightString(576, 762, "Master SOW, PRD & TRD Specification v3.0")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(36, 754, 576, 754)

        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(36, 42, 576, 42)
        self.drawString(36, 30, "AIVI Intelligence Private Limited • Confidential & Proprietary Operational Baseline")
        self.drawRightString(576, 30, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="personal-gtm-os/AIVI_GTM_OS_Master_SOW_PRD_TRD_Specification.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A")
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569")
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#334155")
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=5,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#334155"),
        spaceBefore=2.5,
        spaceAfter=3.5
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
        leftIndent=10,
        firstLineIndent=-7,
        spaceBefore=1,
        spaceAfter=1
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#1E293B")
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#0F172A")
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9.5,
        textColor=colors.white
    )

    story = []

    # 1. Header with Logo & Corporate Info
    logo_path = "aivi_brand_website/assets/aivi_letterhead_logo.png"
    if os.path.exists(logo_path):
        # Strict proportional native aspect ratio 1.7696:1 -> height 36 pt, width 63.71 pt
        logo_img = Image(logo_path, width=63.71, height=36)
        header_table = Table(
            [[logo_img, Paragraph("<b>AIVI Intelligence Private Limited</b><br/>Executive GTM Engineering & Operations Group<br/><i>Gorakhpur • Bangalore • Global Outbound Terminal</i>", ParagraphStyle('HRight', parent=meta_style, alignment=2))]],
            colWidths=[100, 440]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0F172A"), spaceBefore=1, spaceAfter=8))

    # Document Header Title
    story.append(Paragraph("Personal GTM Operating System (AIVI GTM OS)", title_style))
    story.append(Paragraph("Master Unified Specification: Statement of Work (SOW), Product Requirements (PRD) & Technical Requirements (TRD)", subtitle_style))
    story.append(Spacer(1, 6))

    # Metadata Grid
    meta_data = [
        [
            Paragraph("<b>Version:</b> 3.0 (Autonomous Discovery Baseline)", meta_style),
            Paragraph("<b>Primary Operator:</b> Rishikesh Raj (COO)", meta_style),
            Paragraph("<b>Active Pipeline:</b> ₹37.66L/mo (₹4.52 Cr ARR)", meta_style)
        ],
        [
            Paragraph("<b>Date:</b> 12 November 2026", meta_style),
            Paragraph("<b>Executive Sponsor:</b> Abhishek Mishra (CEO)", meta_style),
            Paragraph("<b>Architectural Refs:</b> Sellbird / Harvey / OpenEnrich", meta_style)
        ],
        [
            Paragraph("<b>Status:</b> Approved & Integrated in Monolith", meta_style),
            Paragraph("<b>Pilot Product:</b> HackMyWebsite (hackmywebsite.io)", meta_style),
            Paragraph("<b>SaaS Subscription Cost:</b> <b>₹0 / Month</b>", meta_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[180, 180, 180])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # Executive Overview
    story.append(Paragraph("Executive Summary & Autonomous Sourcing Evolution", h1_style))
    story.append(Paragraph(
        "Commercial B2B customer acquisition has traditionally relied on fragmented subscription platforms (Apollo, Lusha, Clay, NeverBounce, Sales Navigator, Instantly, HubSpot) incurring <b>$500+ monthly (₹42,500/mo)</b> in software overhead. Beyond cost, proprietary data silos lock operators into credit meters for data that is already available across public digital assets.",
        body_style
    ))
    story.append(Paragraph(
        "The <b>Personal GTM OS (v3.0)</b> eliminates all third-party subscription dependencies. By incorporating the architectural breakthroughs of <b>Sellbird</b> (<code>ethanplusai/sellbird</code>) and <b>Harvey</b>, the platform now combines zero-cost account discovery (OpenStreetMap Overpass API and polite search dorks), deterministic website profiling (detecting tech stacks, ad pixels, and footer agency credits), HTML/Schema.org decision-maker extraction, and email pattern derivation with our in-house sovereign WhatsApp/phone extractor.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Section 1: SOW
    story.append(Paragraph("SECTION 1: STATEMENT OF WORK (SOW)", h1_style))
    story.append(Paragraph("1.1 Commercial Baseline & Zero-SaaS Replacement Matrix", h2_style))

    comm_data = [
        [Paragraph("Legacy Commercial Tool", table_header), Paragraph("Replaced Function", table_header), Paragraph("Vendor Cost", table_header), Paragraph("GTM OS Sovereign Replacement", table_header), Paragraph("GTM OS Cost", table_header)],
        [Paragraph("Apollo.io (Pro)", table_cell_bold), Paragraph("Account Discovery & Sourcing", table_cell), Paragraph("$99 / mo", table_cell), Paragraph("OpenStreetMap API + SERP Dorks (`discover.py`)", table_cell), Paragraph("₹0 / mo", table_cell_bold)],
        [Paragraph("Clay.com (Explorer)", table_cell_bold), Paragraph("Waterfall Phone Enrichment", table_cell), Paragraph("$149 / mo", table_cell), Paragraph("`SovereignEnrichmentService` (WA + Mobile Regex)", table_cell), Paragraph("₹0 / mo", table_cell_bold)],
        [Paragraph("LinkedIn Sales Nav", table_cell_bold), Paragraph("Decision-Maker Research", table_cell), Paragraph("$99 / mo", table_cell), Paragraph("`SovereignPeopleExtractor` (`people.py`)", table_cell), Paragraph("₹0 / mo", table_cell_bold)],
        [Paragraph("NeverBounce / Hunter", table_cell_bold), Paragraph("Email Pattern & Verification", table_cell), Paragraph("$49 / mo", table_cell), Paragraph("`SovereignPatternEngine` + RFC 5321 Socket", table_cell), Paragraph("₹0 / mo", table_cell_bold)],
        [Paragraph("Instantly / Lemlist", table_cell_bold), Paragraph("Cold Outreach Sequencing", table_cell), Paragraph("$59 / mo", table_cell), Paragraph("5-Stage Pitch Studio + Zoho Fast-Dispatch", table_cell), Paragraph("₹0 / mo", table_cell_bold)],
        [Paragraph("HubSpot CRM (Starter)", table_cell_bold), Paragraph("Deal Pipeline & Revenue Tracking", table_cell), Paragraph("$50 / mo", table_cell), Paragraph("Live MRR/ARR Dynamic Engine & Lost Tracker", table_cell), Paragraph("₹0 / mo", table_cell_bold)],
        [Paragraph("Total Monthly Spend", table_header), Paragraph("Consolidated SDR Software Stack", table_header), Paragraph("$505/mo (~₹42.5k)", table_header), Paragraph("Unified Local Monolith Cockpit", table_header), Paragraph("₹0 / Month", table_header)]
    ]
    t_comm = Table(comm_data, colWidths=[95, 115, 65, 195, 70])
    t_comm.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#0F172A")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, colors.HexColor("#F8FAFC")]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_comm)
    story.append(Spacer(1, 6))

    story.append(Paragraph("1.2 Master Scope of Workstreams (v3.0)", h2_style))
    deliverables = [
        "<b>Autonomous Account Discovery:</b> Free geographic discovery via OpenStreetMap Overpass API and polite search dorks, filtered by `JUNK_DOMAIN_PATTERNS` to discard directories (JustDial, IndiaMART, Clutch, Yelp).",
        "<b>Deterministic Company Profiling:</b> 3 HTTP requests per target (homepage, /robots.txt, /sitemap.xml) extracting tech stacks, ad spend signals (Meta Ads, Google Tag Manager), and footer agency credits.",
        "<b>People & Decision-Maker Scout:</b> Direct extraction of Founders, CEOs, MDs, and CTOs from target websites and Schema.org JSON-LD with strict false-positive filtering (`COMMON_WORDS`).",
        "<b>Email Pattern & MX Classification:</b> Derives corporate email formats from public site emails ({f}.{l}, {f}, {fi}{l}), classifies MX hosts (Google, Microsoft, Gateway), and detects catch-all domains.",
        "<b>Sovereign Phone & WhatsApp Extractor:</b> Live WhatsApp anchor parser (wa.me/), Indian mobile series recognizer (+91 [6-9]), and corporate suffix normalizer (strips llp, pvt, ltd for DNS fallback).",
        "<b>HackMyWebsite Pricing Integration:</b> Official SaaS tiers (Starter ₹1,999/mo, Pro ₹2,999/mo, Agency ₹4,999/mo, Enterprise ₹9,999/mo) with live MRR/ARR aggregation and lost deal deduction.",
        "<b>5-Stage Sequence Outreach Studio:</b> Deep prospect dossiers paired with 5 sequential outreach stages (Cold Pitch, Demo Walkthrough, Day 3 Follow-up, Day 7 Breakup, Rejection Nurture) and Zoho Mail sync.",
        "<b>Multi-Sheet Formatted Reporting:</b> One-click export producing 2-sheet formatted Microsoft Excel (.xlsx) workbooks containing complete account records and ready-to-dispatch pitches."
    ]
    for d in deliverables:
        story.append(Paragraph(f"• {d}", bullet_style))
    story.append(Spacer(1, 6))

    # Section 2: PRD
    story.append(Paragraph("SECTION 2: PRODUCT REQUIREMENTS DOCUMENT (PRD)", h1_style))
    story.append(Paragraph("2.1 Product Vision, ICP & Sourcing Target", h2_style))
    story.append(Paragraph(
        "<b>Target Ideal Customer Profile (ICP):</b> Founders, Managing Directors, CEOs, CTOs, and Technical Partners of Indian custom web development agencies, software houses, and digital product studios (team size 5–150 engineers) across Bengaluru, Delhi-NCR, Mumbai, Pune, and Hyderabad.<br/>"
        "<b>Value Proposition Pitch:</b> Equipping agencies with HackMyWebsite's automated DAST/SAST penetration scanner and GitHub PR Security Gateway as a white-labeled value-add or client security shield, enabling them to secure high-margin client maintenance retainers and eliminate security liabilities.",
        body_style
    ))
    story.append(Paragraph("2.2 Functional Requirements Matrix (v3.0)", h2_style))

    fr_data = [
        [Paragraph("Req ID", table_header), Paragraph("Module", table_header), Paragraph("Functional Requirement Description", table_header), Paragraph("Status", table_header)],
        [Paragraph("FR-01", table_cell_bold), Paragraph("Autonomous Discovery", table_cell), Paragraph("Query OpenStreetMap Overpass API and search dorks by city and niche; filter directories via JUNK_DOMAIN_PATTERNS.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-02", table_cell_bold), Paragraph("Decision-Maker Scout", table_cell), Paragraph("Extract Founder/CEO/CTO names from HTML cards, prose sentences, and Schema.org founder tags without third-party scrapers.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-03", table_cell_bold), Paragraph("Pattern & Verification", table_cell), Paragraph("Classify MX hosts (Google/M365/Gateway), derive email patterns ({f}.{l}, {fi}{l}), and flag catch-alls.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-04", table_cell_bold), Paragraph("Sovereign Phone & WA", table_cell), Paragraph("Extract direct WhatsApp links (wa.me/) and +91 10-digit mobiles with click-to-chat links and domain suffix fallback.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-05", table_cell_bold), Paragraph("Dynamic Financials", table_cell), Paragraph("Dropdown plan selector dynamically recalculates active MRR/ARR and accrues lost revenue when an agency declines.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-06", table_cell_bold), Paragraph("5-Stage Outreach", table_cell), Paragraph("Render 5-stage sequential outreach tabs with one-click clipboard copy and Zoho dispatch state tracking.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-07", table_cell_bold), Paragraph("Multi-Sheet Excel", table_cell), Paragraph("Export 2-sheet formatted .xlsx workbook (Sheet 1: Leads & Pricing, Sheet 2: Outreach Pitches).", table_cell), Paragraph("Verified", table_cell_bold)],
    ]
    t_fr = Table(fr_data, colWidths=[38, 90, 352, 60])
    t_fr.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_fr)
    story.append(Spacer(1, 6))

    # Section 3: TRD
    story.append(Paragraph("SECTION 3: TECHNICAL REQUIREMENTS DOCUMENT (TRD)", h1_style))
    story.append(Paragraph("3.1 System Architecture & Monolithic Topology", h2_style))
    story.append(Paragraph(
        "The system runs as an optimized local monolith requiring <b>< 450 MB RAM</b> on macOS Apple Silicon:<br/>"
        "• <b>Frontend Layer:</b> Next.js 14.2.15 (App Router, TypeScript, Tailwind CSS, Lucide icons) running on port 3000.<br/>"
        "• <b>Backend Layer:</b> FastAPI 0.110 (Python 3.9+, SQLAlchemy ORM, Uvicorn ASGI server) running on port 8000.<br/>"
        "• <b>Database Layer:</b> SQLite 3.54 in WAL mode (`personal-gtm-os/data/gtm.db`) ensuring ACID compliance and instant local querying.<br/>"
        "• <b>Sovereign Services:</b> `SovereignDiscoveryService`, `SovereignPeopleExtractor`, `SovereignPatternEngine`, and `SovereignEnrichmentService` utilizing `httpx` async crawler, `BeautifulSoup4`, and native regex.",
        body_style
    ))

    story.append(Paragraph("3.2 Core REST API Endpoints", h2_style))
    api_data = [
        [Paragraph("Method", table_header), Paragraph("Endpoint Path", table_header), Paragraph("Description & Parameters", table_header), Paragraph("Response Payload", table_header)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/discovery/generate-leads", table_cell), Paragraph("Initiates autonomous OSM & SERP sourcing pass", table_cell), Paragraph("{ run_id, status: 'started' }", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/discovery/runs/{id}", table_cell), Paragraph("Polls progress of active discovery run", table_cell), Paragraph("{ status, progress, new_leads }", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/leads", table_cell), Paragraph("Paginated leads query with search and status filters", table_cell), Paragraph("{ total, leads: [...] }", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/leads/{id}", table_cell), Paragraph("Full lead dossier, email candidates, and 5-stage drafts", table_cell), Paragraph("{ lead, candidates, drafts }", table_cell)],
        [Paragraph("PUT", table_cell_bold), Paragraph("/api/leads/{id}/deal-status", table_cell), Paragraph("Updates deal status and recalculates pipeline metrics", table_cell), Paragraph("{ status: 'success', lead }", table_cell)],
        [Paragraph("PUT", table_cell_bold), Paragraph("/api/leads/{id}/select-email", table_cell), Paragraph("Selects active work email from candidate list", table_cell), Paragraph("{ status: 'success', selected_email }", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/leads/{id}/sovereign-enrich", table_cell), Paragraph("Auto-enriches existing lead with verified phone in SQLite", table_cell), Paragraph("{ status: 'success', phone }", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/leads/sovereign-lookup", table_cell), Paragraph("Standalone lookup for arbitrary domain without DB write", table_cell), Paragraph("{ status: 'success', enrichment }", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/leads/export/excel", table_cell), Paragraph("Generates 2-sheet formatted Microsoft Excel workbook", table_cell), Paragraph("Binary .xlsx stream", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/stats/overview", table_cell), Paragraph("Returns live aggregate metrics (MRR, ARR, Lost, Outbox)", table_cell), Paragraph("{ estimated_mrr, lost_mrr, ... }", table_cell)]
    ]
    t_api = Table(api_data, colWidths=[40, 150, 195, 155])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 8))

    # Formal Sign-Off Block
    story.append(Paragraph("SECTION 4: FORMAL APPROVAL & BASELINE SIGN-OFF", h1_style))
    story.append(Paragraph(
        "By signing below, the project owner and executive sponsor confirm that the Personal GTM Operating System meets all functional, commercial, and technical requirements as specified for Version 3.0.",
        body_style
    ))
    story.append(Spacer(1, 8))

    sign_data = [
        [
            Paragraph("<b>PROJECT OWNER & PRIMARY OPERATOR</b><br/><br/>________________________________________<br/><b>Rishikesh Raj</b><br/>Chief Operating Officer (COO)<br/>AIVI Intelligence Private Limited<br/>Date: 12 November 2026", body_style),
            Paragraph("<b>EXECUTIVE SPONSOR & REVIEWER</b><br/><br/>________________________________________<br/><b>Abhishek Mishra</b><br/>Founder & Chief Executive Officer (CEO)<br/>AIVI Intelligence Private Limited<br/>Date: 12 November 2026", body_style)
        ]
    ]
    t_sign = Table(sign_data, colWidths=[270, 270])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built: {filename}")

if __name__ == "__main__":
    build_pdf()
