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
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Don't draw running header on cover/first page
        if self._pageNumber > 1:
            # Running Header
            self.drawString(36, 762, "AIVI GTM OPERATING SYSTEM (AIVI GTM OS)")
            self.drawRightString(576, 762, "Master Unified Specification: SOW, PRD & TRD v1.0")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.6)
            self.line(36, 755, 576, 755)

        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(36, 40, 576, 40)
        self.drawString(36, 28, "AIVI Intelligence Private Limited • Executive GTM Operations Baseline • Confidential & Proprietary")
        self.drawRightString(576, 28, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="personal-gtm-os/AIVI_GTM_OS_Master_Specification_v1.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
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
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#475569")
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=11,
        textColor=colors.HexColor("#334155")
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=11,
        spaceAfter=4,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=7,
        spaceAfter=2.5,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=11,
        textColor=colors.HexColor("#334155"),
        spaceBefore=2,
        spaceAfter=3
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
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
        fontSize=6.5,
        leading=9,
        textColor=colors.HexColor("#1E293B")
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=6.5,
        leading=9,
        textColor=colors.HexColor("#0F172A")
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=6.8,
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
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=1.2, color=colors.HexColor("#0F172A"), spaceBefore=1, spaceAfter=6))

    # Title & Metadata
    story.append(Paragraph("Personal GTM Operating System (AIVI GTM OS)", title_style))
    story.append(Paragraph("Master Unified Specification: Statement of Work (SOW), Product Requirements (PRD) & Technical Requirements (TRD)", subtitle_style))
    story.append(Spacer(1, 5))

    meta_data = [
        [
            Paragraph("<b>Version:</b> 1.0 (Finalized Operational Baseline)", meta_style),
            Paragraph("<b>Primary Operator:</b> Rishikesh Raj (COO)", meta_style),
            Paragraph("<b>Active Pipeline:</b> ₹37.66L/mo (₹4.52 Cr ARR)", meta_style)
        ],
        [
            Paragraph("<b>Date:</b> 12 November 2026", meta_style),
            Paragraph("<b>Executive Sponsor:</b> Abhishek Mishra (CEO)", meta_style),
            Paragraph("<b>Active Base:</b> 1,000 Sourced Agency Leads", meta_style)
        ],
        [
            Paragraph("<b>Status:</b> Production-Validated on Localhost", meta_style),
            Paragraph("<b>Pilot Product:</b> HackMyWebsite (hackmywebsite.io)", meta_style),
            Paragraph("<b>SaaS Subscription Cost:</b> <b>₹0 / Month</b>", meta_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[180, 180, 180])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.6, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6))

    # Executive Overview: What are we doing & How are we proceeding
    story.append(Paragraph("Executive Overview: Purpose & Operating Architecture", h1_style))
    story.append(Paragraph(
        "<b>What We Are Doing:</b> The Personal GTM Operating System is an end-to-end, local-first sales terminal built to discover, profile, verify, sequence, and close B2B accounts at scale with strictly <b>₹0 in monthly software subscriptions</b>. It replaces an expensive 5-tool commercial SaaS matrix (Apollo, Clay, Hunter, Lemlist, HubSpot) costing $505+/month (₹42,500/mo) with sovereign code running entirely on macOS hardware.",
        body_style
    ))
    story.append(Paragraph(
        "<b>How We Are Proceeding:</b> The system executes an automated, deterministic pipeline: <i>(1) Account Discovery</i> via OpenStreetMap and clean search dorks; <i>(2) Company Profiling</i> in 3 lightweight HTTP requests; <i>(3) Decision-Maker Extraction</i> via HTML cards and Schema.org founder tags; <i>(4) Pattern & Deliverability Verification</i> via MX classification and honest status tagging; <i>(5) Sovereign Phone & WhatsApp Extraction</i> via wa.me/ anchors and mobile regex; <i>(6) Dynamic Revenue Accounting</i> mapped to HackMyWebsite tiers; <i>(7) 5-Stage Outreach Studio</i> optimized for Zoho Mail fast dispatch; and <i>(8) Multi-Sheet Executive Reporting</i>.",
        body_style
    ))
    story.append(Spacer(1, 5))

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
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_comm)
    story.append(Spacer(1, 5))

    story.append(Paragraph("1.2 How We Get & Verify Leads, Emails, Numbers & Research", h2_style))
    lead_steps = [
        "<b>Where & How We Get Leads:</b> Accounts are discovered via OpenStreetMap Overpass API (tagging `office=it`, `office=company`, `craft=web_developer`) and polite search queries across DuckDuckGo HTML and Bing. We apply `JUNK_DOMAIN_PATTERNS` to instantly filter out aggregators and directories (JustDial, IndiaMART, Sulekha, Yelp, Clutch, GoodFirms, Wikipedia).",
        "<b>How We Research the Companies:</b> The profiler issues exactly 3 HTTP requests: homepage, /robots.txt, and /sitemap.xml (or /contact). It extracts technology stacks (WordPress, Webflow, React, Next.js), ad tracking pixels (Meta Ads, Google Tag Manager), and incumbent agency credits in footers ('Website by', 'Powered by').",
        "<b>How We Extract Decision-Makers:</b> Using HTML card and prose parsing over /about, /team, and /leadership plus Schema.org `founder`/`employee` tags. Rejects false-positive headings using `COMMON_WORDS` ('Team of Experts', 'Family Owned') and cleans names of honorifics and suffixes.",
        "<b>How We Get & Verify Emails:</b> Scrapes published email addresses on the target site to derive the organization's dominant pattern ({f}.{l}, {f}, {fi}{l}). Classifies MX hosts (Google Workspace, Microsoft 365, Gateway, Self-Hosted), detects catch-all domains, and validates mailboxes.",
        "<b>How We Get Verified Numbers:</b> The sovereign phone engine inspects HTML anchor tags for wa.me/ and api.whatsapp.com links (100% confidence), parses Indian 10-digit mobile series (+91 [6-9]), distinguishes landlines, and tests domain fallbacks (stripping llp, pvt, ltd for DNS resolution).",
        "<b>How We Craft Tailored Emails:</b> The review modal presents 5 dedicated sequence stages (Initial Cold, Demo Walkthrough, Day 3 Follow-up, Day 7 Breakup, Rejection Nurture) citing the agency's actual tech stack and client security retainer opportunities."
    ]
    for s in lead_steps:
        story.append(Paragraph(f"• {s}", bullet_style))
    story.append(Spacer(1, 5))

    story.append(Paragraph("1.3 Deduplication Protocol: Scaling from 1,000 to 2,000+ Leads", h2_style))
    story.append(Paragraph(
        "To guarantee that generating subsequent batches of 1,000 to 2,000+ leads never creates collisions or duplicate outreach, the system enforces a 4-tier deduplication protocol:<br/>"
        "1. <b>Canonical Domain Normalization:</b> Converts all URLs into lowercase bare hostnames (stripping https://, www., and paths) and cross-references regional TLDs (.in, .co.in, .com).<br/>"
        "2. <b>Database Unique Constraints:</b> Unique indexes on `company_domain` and `email` reject duplicate inserts at the database driver level.<br/>"
        "3. <b>Pre-Crawl Bloom Filter:</b> The discovery collector queries existing database domains in bulk (`WHERE company_domain NOT IN (...)`) before triggering HTTP profiling, wasting zero network requests.<br/>"
        "4. <b>Offset Pacing & Run Logs:</b> Every discovery pass logs into `discovery_runs` recording city, niche, and query offsets so subsequent runs systematically query the next geographic segments.",
        body_style
    ))
    story.append(Spacer(1, 5))

    # Section 2: PRD
    story.append(Paragraph("SECTION 2: PRODUCT REQUIREMENTS DOCUMENT (PRD)", h1_style))
    story.append(Paragraph("2.1 Target ICP & Value Proposition", h2_style))
    story.append(Paragraph(
        "<b>Ideal Customer Profile (ICP):</b> Founders, CEOs, MDs, CTOs, and Technical Partners of Indian custom web development agencies, software studios, and digital consultancies (5–150 engineers) across Bengaluru, Delhi-NCR, Mumbai, Pune, and Hyderabad.<br/>"
        "<b>Value Proposition:</b> Equipping agencies with HackMyWebsite's automated DAST/SAST scanner and GitHub PR Security Gateway as a white-labeled value-add or client security shield, enabling them to secure client maintenance retainers and eliminate security liabilities.",
        body_style
    ))
    story.append(Paragraph("2.2 Functional Requirements Matrix", h2_style))

    fr_data = [
        [Paragraph("Req ID", table_header), Paragraph("Module", table_header), Paragraph("Functional Requirement Description", table_header), Paragraph("Status", table_header)],
        [Paragraph("FR-01", table_cell_bold), Paragraph("Autonomous Discovery", table_cell), Paragraph("Query OpenStreetMap Overpass API and search dorks by city and niche; filter directories via JUNK_DOMAIN_PATTERNS.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-02", table_cell_bold), Paragraph("Deterministic Profiling", table_cell), Paragraph("3 HTTP requests per target extracting tech stacks, ad spend signals (Meta Ads, GTM), and footer agency credits.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-03", table_cell_bold), Paragraph("Decision-Maker Scout", table_cell), Paragraph("Extract Founder/CEO/CTO names from HTML cards, prose sentences, and Schema.org founder tags without third-party scrapers.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-04", table_cell_bold), Paragraph("Pattern & Verification", table_cell), Paragraph("Classify MX hosts (Google/M365/Gateway), derive email patterns ({f}.{l}, {fi}{l}), and flag catch-alls.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-05", table_cell_bold), Paragraph("Sovereign Phone & WA", table_cell), Paragraph("Extract direct WhatsApp links (wa.me/) and +91 10-digit mobiles with click-to-chat links and domain suffix fallback.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-06", table_cell_bold), Paragraph("Dynamic Financials", table_cell), Paragraph("Dropdown plan selector dynamically recalculates active MRR/ARR and accrues lost revenue when an agency declines.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-07", table_cell_bold), Paragraph("5-Stage Outreach", table_cell), Paragraph("Render 5-stage sequential outreach tabs with one-click clipboard copy and Zoho dispatch state tracking.", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-08", table_cell_bold), Paragraph("Multi-Sheet Excel", table_cell), Paragraph("Export 2-sheet formatted .xlsx workbook (Sheet 1: Leads & Pricing, Sheet 2: Outreach Pitches).", table_cell), Paragraph("Verified", table_cell_bold)],
        [Paragraph("FR-09", table_cell_bold), Paragraph("Deduplication Engine", table_cell), Paragraph("Canonical domain hashing, database unique constraints, and bloom filtering preventing duplicate accounts across runs.", table_cell), Paragraph("Verified", table_cell_bold)],
    ]
    t_fr = Table(fr_data, colWidths=[36, 85, 359, 60])
    t_fr.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_fr)
    story.append(Spacer(1, 5))

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

    story.append(Paragraph("3.2 Core REST API Endpoint Reference", h2_style))
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
    t_api = Table(api_data, colWidths=[38, 150, 197, 155])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 6))

    # Section 4: Formal Approval & Baseline Sign-Off Block
    story.append(Paragraph("SECTION 4: FORMAL APPROVAL & BASELINE SIGN-OFF", h1_style))
    story.append(Paragraph(
        "By signing below, the project owner and executive sponsor confirm that the Personal GTM Operating System meets all functional, commercial, and technical requirements as specified for Version 1.0 Finalized Baseline.",
        body_style
    ))
    story.append(Spacer(1, 6))

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
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built: {filename}")

if __name__ == "__main__":
    build_pdf()
