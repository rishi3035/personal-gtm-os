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
    def __init__(self, *args, doc_title="AIVI GTM OPERATING SYSTEM", doc_subtitle="Specification Document", **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.doc_title = doc_title
        self.doc_subtitle = doc_subtitle

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
            self.drawString(36, 762, self.doc_title)
            self.drawRightString(576, 762, self.doc_subtitle)
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

def create_canvas_factory(title, subtitle):
    def canvas_maker(*args, **kwargs):
        return NumberedCanvas(*args, doc_title=title, doc_subtitle=subtitle, **kwargs)
    return canvas_maker

def get_shared_styles():
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#0F172A")
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#2563EB")
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
        fontSize=11,
        leading=14.5,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=3.5,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=10.5,
        textColor=colors.HexColor("#334155"),
        spaceBefore=2,
        spaceAfter=2.5
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=10.2,
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
        leading=8.8,
        textColor=colors.HexColor("#1E293B")
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=6.5,
        leading=8.8,
        textColor=colors.HexColor("#0F172A")
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=6.8,
        leading=9.2,
        textColor=colors.white
    )
    return {
        'title': title_style,
        'subtitle': subtitle_style,
        'meta': meta_style,
        'h1': h1_style,
        'h2': h2_style,
        'body': body_style,
        'bullet': bullet_style,
        'cell': table_cell,
        'cell_bold': table_cell_bold,
        'header': table_header
    }

def add_header_block(story, doc_title_text, doc_sub_text, doc_id, meta_records, s):
    logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../aivi_brand_website/assets/aivi_letterhead_logo.png"))
    if not os.path.exists(logo_path):
        logo_path = os.path.abspath("aivi_brand_website/assets/aivi_letterhead_logo.png")
    if os.path.exists(logo_path):
        logo_img = Image(logo_path, width=63.71, height=36)
        header_table = Table(
            [[logo_img, Paragraph("<b>AIVI Intelligence Private Limited</b><br/>Executive GTM Engineering & Operations Group<br/><i>Gorakhpur • Bangalore • Global Outbound Terminal</i>", ParagraphStyle('HRight', parent=s['meta'], alignment=2))]],
            colWidths=[100, 440]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 5))
        story.append(HRFlowable(width="100%", thickness=1.2, color=colors.HexColor("#0F172A"), spaceBefore=1, spaceAfter=5))

    story.append(Paragraph(doc_title_text, s['title']))
    story.append(Paragraph(doc_sub_text, s['subtitle']))
    story.append(Spacer(1, 4))

    meta_table = Table(meta_records, colWidths=[180, 180, 180])
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

def add_signoff_block(story, s):
    story.append(Paragraph("Formal Approval & Baseline Sign-Off", s['h1']))
    story.append(Paragraph(
        "By signing below, the project owner and executive reviewer verify that this document represents the approved baseline for Version 1.0 of the Personal GTM Operating System.",
        s['body']
    ))
    story.append(Spacer(1, 5))

    sign_data = [
        [
            Paragraph("<b>PROJECT OWNER & PRIMARY OPERATOR</b><br/><br/>________________________________________<br/><b>Rishikesh Raj</b><br/>Chief Operating Officer (COO)<br/>AIVI Intelligence Private Limited<br/>Date: 12 November 2026", s['body']),
            Paragraph("<b>EXECUTIVE SPONSOR & REVIEWER</b><br/><br/>________________________________________<br/><b>Abhishek Mishra</b><br/>Founder & Chief Executive Officer (CEO)<br/>AIVI Intelligence Private Limited<br/>Date: 12 November 2026", s['body'])
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

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# -------------------------------------------------------------
# 1. BUILD SOW PDF
# -------------------------------------------------------------
def build_sow_pdf(filename=None):
    if filename is None:
        filename = os.path.join(BASE_DIR, "01_AIVI_GTM_OS_Statement_of_Work_SOW.pdf")
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(filename, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=46, bottomMargin=46)
    s = get_shared_styles()
    story = []

    meta = [
        [Paragraph("<b>Doc ID:</b> AIVI-GTM-OS-SOW-V1.0", s['meta']), Paragraph("<b>Primary Operator:</b> Rishikesh Raj (COO)", s['meta']), Paragraph("<b>Active Pipeline:</b> ₹37.66L/mo MRR", s['meta'])],
        [Paragraph("<b>Version:</b> 1.0 Operational Baseline", s['meta']), Paragraph("<b>Executive Sponsor:</b> Abhishek Mishra (CEO)", s['meta']), Paragraph("<b>Baseline Base:</b> 1,000 Sourced Agencies", s['meta'])],
        [Paragraph("<b>Date:</b> 12 November 2026", s['meta']), Paragraph("<b>Pilot Product:</b> HackMyWebsite (hackmywebsite.io)", s['meta']), Paragraph("<b>SaaS Overhead:</b> <b>₹0 / Month</b>", s['meta'])]
    ]
    add_header_block(story, "Personal GTM Operating System (AIVI GTM OS)", "Document 1: Statement of Work (SOW) — Version 1.0 Finalized Baseline", "SOW-V1.0", meta, s)

    story.append(Paragraph("1. Executive Summary & Business Problem Solved", s['h1']))
    story.append(Paragraph(
        "<b>The Problem:</b> Conventional B2B outbound customer acquisition is severely fragmented across 5 commercial vendors (Apollo, Clay, Hunter, Lemlist, HubSpot), charging in excess of <b>$505+/month (₹42,500/mo)</b> in recurring fees. Beyond heavy burn, these vendors charge expensive credit fees for data sitting in plain text on the public web, while creating generic email sequencing that triggers spam filters.<br/>"
        "<b>The Sovereign Solution:</b> The Personal GTM Operating System consolidates this entire sales pipeline into a single, cohesive, local-first monolithic terminal running at <b>strictly ₹0 monthly SaaS spend</b> on local Apple Silicon hardware. First deployed for HackMyWebsite targeting 1,000 Indian web development agencies, the system empowers Rishikesh Raj (COO) to qualify leads, extract WhatsApp numbers, dispatch personalized outreach via Zoho Mail, and manage revenue without third-party lock-in.",
        s['body']
    ))

    story.append(Paragraph("2. Commercial Baseline & Zero-SaaS Replacement Matrix", s['h1']))
    comm_data = [
        [Paragraph("Legacy Commercial Tool", s['header']), Paragraph("Replaced Function", s['header']), Paragraph("Vendor Cost", s['header']), Paragraph("GTM OS Sovereign Replacement", s['header']), Paragraph("GTM OS Cost", s['header'])],
        [Paragraph("Apollo.io (Pro)", s['cell_bold']), Paragraph("Account Discovery & Lead Sourcing", s['cell']), Paragraph("$99 / mo", s['cell']), Paragraph("OpenStreetMap API + SERP Dorks (`discover.py`)", s['cell']), Paragraph("₹0 / mo", s['cell_bold'])],
        [Paragraph("Clay.com (Explorer)", s['cell_bold']), Paragraph("Waterfall Phone Enrichment", s['cell']), Paragraph("$149 / mo", s['cell']), Paragraph("`SovereignEnrichmentService` (WA + Mobile Regex)", s['cell']), Paragraph("₹0 / mo", s['cell_bold'])],
        [Paragraph("LinkedIn Sales Nav", s['cell_bold']), Paragraph("Decision-Maker Research", s['cell']), Paragraph("$99 / mo", s['cell']), Paragraph("`SovereignPeopleExtractor` (`people.py`)", s['cell']), Paragraph("₹0 / mo", s['cell_bold'])],
        [Paragraph("NeverBounce / Hunter", s['cell_bold']), Paragraph("Email Pattern & Verification", s['cell']), Paragraph("$49 / mo", s['cell']), Paragraph("`SovereignPatternEngine` + RFC 5321 Socket", s['cell']), Paragraph("₹0 / mo", s['cell_bold'])],
        [Paragraph("Instantly / Lemlist", s['cell_bold']), Paragraph("Cold Outreach Sequencing", s['cell']), Paragraph("$59 / mo", s['cell']), Paragraph("5-Stage Pitch Studio + Zoho Fast-Dispatch", s['cell']), Paragraph("₹0 / mo", s['cell_bold'])],
        [Paragraph("HubSpot CRM (Starter)", s['cell_bold']), Paragraph("Deal Pipeline & Revenue Tracking", s['cell']), Paragraph("$50 / mo", s['cell']), Paragraph("Live MRR/ARR Dynamic Engine & Lost Tracker", s['cell']), Paragraph("₹0 / mo", s['cell_bold'])],
        [Paragraph("Total Monthly Spend", s['header']), Paragraph("Consolidated SDR Software Stack", s['header']), Paragraph("$505/mo (~₹42.5k)", s['header']), Paragraph("Unified Local Monolith Cockpit", s['header']), Paragraph("₹0 / Month", s['header'])]
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

    story.append(Paragraph("3. End-to-End Operational Lifecycle (8 Workstreams)", s['h1']))
    workstreams = [
        "<b>Workstream 1: Autonomous Account Discovery (`discover.py`):</b> OpenStreetMap Overpass API queries tagged geo-entities (`office=it`, `craft=web_developer`) across key cities (Bengaluru, Delhi-NCR, Mumbai, Pune, Hyderabad) paired with polite search dorks. Uses `JUNK_DOMAIN_PATTERNS` to drop JustDial, IndiaMART, Yelp, Clutch, and aggregators.",
        "<b>Workstream 2: Deterministic Company Profiling (`profile.py`):</b> Issues 3 lightweight asynchronous HTTP requests (homepage, `/robots.txt`, and `/sitemap.xml` / `/contact`). Identifies tech stacks (WordPress, Webflow, React, Next.js), ad pixels (Meta Pixel, Google Tag Manager), and footer agency credits ('Website by', 'Powered by').",
        "<b>Workstream 3: Decision-Maker Scout (`people.py`):</b> Crawls up to 6 internal pages (`/about`, `/team`, `/leadership`, `/management`). Parses HTML card tokens, prose attribution sentences, and Schema.org JSON-LD `founder`/`employee` tags. Excludes non-person headings via `COMMON_WORDS`.",
        "<b>Workstream 4: Email Pattern Derivation & Deliverability (`email_finder.py`):</b> Resolves DNS MX records to classify mail hosts (Google Workspace, M365, Gateways, Self-Hosted). Derives organizational syntax (`{f}.{l}`, `{f}`, `{fi}{l}`) from public addresses and probes mailboxes with honest deliverability tagging (`valid`, `risky`, `invalid`).",
        "<b>Workstream 5: Sovereign Phone & WhatsApp Intelligence (`sovereign_enrichment_service.py`):</b> Scans DOM anchors for direct `wa.me/` links (100% confidence), extracts Indian 10-digit mobile series (`+91 [6-9]`), isolates landlines, and implements corporate suffix fallbacks (`softerectorllp.com` -> `softerector.com`).",
        "<b>Workstream 6: Commercial Pricing & Dynamic Revenue Engine:</b> Classifies accounts into HackMyWebsite tiers (Starter ₹1,999/mo, Pro ₹2,999/mo, Agency ₹4,999/mo, Enterprise ₹9,999/mo) and tracks real-time MRR, ARR, and lost deal revenue deductions.",
        "<b>Workstream 7: 5-Stage Outreach Studio & Fast-Dispatch:</b> Comprehensive review modal offering 5 sequence stages (Initial Cold, Demo Walkthrough, Day-3 Follow-up, Day-7 Breakup, Rejection Nurture) with one-click clipboard copy and Zoho dispatch logging.",
        "<b>Workstream 8: Multi-Sheet Formatted Reporting:</b> Instant export to stylized 2-sheet Microsoft Excel (`.xlsx`) workbook (Sheet 1: Leads & Pricing, Sheet 2: Outreach Pitches) and lightweight CSV."
    ]
    for w in workstreams:
        story.append(Paragraph(f"• {w}", s['bullet']))
    story.append(Spacer(1, 5))

    story.append(Paragraph("4. Deduplication Protocol: Scaling from 1,000 to 2,000+ Leads", s['h1']))
    story.append(Paragraph(
        "To guarantee that expanding from 1,000 to 2,000+ leads never creates collisions, the system enforces a 4-tier deduplication barrier:<br/>"
        "1. <b>Canonical Domain Normalization:</b> Strips protocols, `www.`, paths, and regional TLD variations (`studio.co.in` vs `studio.com`).<br/>"
        "2. <b>Database Unique Constraints:</b> SQLite unique indexes `ix_leads_company_domain` and `ix_leads_email` reject duplicates at the driver level.<br/>"
        "3. <b>Pre-Crawl Bloom Filter:</b> Sourcing queries filter candidate domains against existing database records before making HTTP requests.<br/>"
        "4. <b>Incremental Run Tracking:</b> Discovery executions log pagination offsets in `discovery_runs` so subsequent runs crawl fresh geographic segments.",
        s['body']
    ))
    story.append(Spacer(1, 6))

    add_signoff_block(story, s)

    doc.build(story, canvasmaker=create_canvas_factory("AIVI GTM OPERATING SYSTEM (AIVI GTM OS)", "Statement of Work (SOW v1.0)"))
    print(f"SOW PDF successfully built: {filename}")

# -------------------------------------------------------------
# 2. BUILD PRD PDF
# -------------------------------------------------------------
def build_prd_pdf(filename=None):
    if filename is None:
        filename = os.path.join(BASE_DIR, "02_AIVI_GTM_OS_Product_Requirements_Document_PRD.pdf")
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(filename, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=46, bottomMargin=46)
    s = get_shared_styles()
    story = []

    meta = [
        [Paragraph("<b>Doc ID:</b> AIVI-GTM-OS-PRD-V1.0", s['meta']), Paragraph("<b>Product Owner:</b> Rishikesh Raj (COO)", s['meta']), Paragraph("<b>Target ICP:</b> Web Dev Agencies", s['meta'])],
        [Paragraph("<b>Version:</b> 1.0 Operational Baseline", s['meta']), Paragraph("<b>Executive Sponsor:</b> Abhishek Mishra (CEO)", s['meta']), Paragraph("<b>Active Leads:</b> 1,000 Loaded in SQLite", s['meta'])],
        [Paragraph("<b>Date:</b> 12 November 2026", s['meta']), Paragraph("<b>Pilot Product:</b> HackMyWebsite (hackmywebsite.io)", s['meta']), Paragraph("<b>SaaS Cost:</b> <b>₹0 / Month</b>", s['meta'])]
    ]
    add_header_block(story, "Personal GTM Operating System (AIVI GTM OS)", "Document 2: Product Requirements Document (PRD) — Version 1.0 Finalized Baseline", "PRD-V1.0", meta, s)

    story.append(Paragraph("1. Product Vision, Core Goals & Tenets", s['h1']))
    story.append(Paragraph(
        "<b>Product Vision:</b> Provide a sovereign, zero-subscription Go-To-Market operating system that enables a single operator to source, profile, verify, enrich, and engage thousands of high-ticket B2B agency prospects without third-party SaaS vendors.<br/>"
        "<b>Core Goals:</b> (1) Zero recurring SaaS spend ($505+/mo saved); (2) 100% verified founder WhatsApp numbers and corporate emails; (3) High-velocity single-operator flywheel (<60s review-to-send cycle for COO Rishikesh Raj); and (4) Collision-free scalability across multi-thousand lead batches.<br/>"
        "<b>Core Tenets:</b> Sovereignty First (all data stays in local `gtm.db`); Truth Over Volume (deep profiling beats unverified scrape dumps); Human-in-the-Loop Velocity (automated research with one-click manual send); Zero External Dependency (OSM, direct DOM scraping, socket RFC 5321 probing).",
        s['body']
    ))

    story.append(Paragraph("2. Target ICP & Buyer Personas", s['h1']))
    story.append(Paragraph(
        "<b>Target ICP:</b> Custom Web Development Agencies, Software Studios, and Digital Product Consultancies (5–150 engineers) in Indian tech hubs (Bengaluru, Delhi-NCR, Mumbai, Pune, Hyderabad, Chennai) building on WordPress, Webflow, Shopify, React, and Next.js.<br/>"
        "<b>Internal Operator Persona:</b> Rishikesh Raj (COO), requiring high-velocity prospecting, instant WhatsApp links, and frictionless outreach dispatch into Zoho Mail.<br/>"
        "<b>Prospect Persona:</b> Agency Founder, CEO, or Technical Director seeking white-label automated security audits and DAST/SAST penetration testing to monetize client maintenance retainers via HackMyWebsite.",
        s['body']
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("3. Functional Requirements Matrix (FR-01 to FR-10)", s['h1']))
    fr_data = [
        [Paragraph("Req ID", s['header']), Paragraph("Module Title", s['header']), Paragraph("Functional Requirement Specification", s['header']), Paragraph("Status", s['header'])],
        [Paragraph("FR-01", s['cell_bold']), Paragraph("Autonomous Discovery", s['cell']), Paragraph("Query OSM Overpass API and polite SERP dorks by city/niche; filter directories via JUNK_DOMAIN_PATTERNS.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-02", s['cell_bold']), Paragraph("Deterministic Profiling", s['cell']), Paragraph("3-request HTTP crawler detecting tech stacks (WordPress, React, Next.js), ad pixels, and footer agency credits.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-03", s['cell_bold']), Paragraph("Decision-Maker Scout", s['cell']), Paragraph("Extract Founder/CEO/CTO names from HTML cards, prose sentences, and Schema.org founder tags without third-party scrapers.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-04", s['cell_bold']), Paragraph("Email Pattern & Verification", s['cell']), Paragraph("Classify MX hosts (Google/M365/Gateway), derive email patterns ({f}.{l}, {fi}{l}), and probe mailboxes via RFC 5321.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-05", s['cell_bold']), Paragraph("Sovereign Phone & WA", s['cell']), Paragraph("Extract direct WhatsApp links (wa.me/) and +91 10-digit mobiles with click-to-chat links and domain suffix fallback.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-06", s['cell_bold']), Paragraph("Dynamic Financials", s['cell']), Paragraph("Dynamic plan selector recalculates active MRR/ARR and accrues lost revenue when an agency declines.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-07", s['cell_bold']), Paragraph("5-Stage Outreach Studio", s['cell']), Paragraph("Render 5-stage sequential outreach tabs with one-click clipboard copy and Zoho dispatch state tracking.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-08", s['cell_bold']), Paragraph("Multi-Sheet Excel Export", s['cell']), Paragraph("Export 2-sheet formatted .xlsx workbook (Sheet 1: Leads & Pricing, Sheet 2: Outreach Pitches) + CSV.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-09", s['cell_bold']), Paragraph("Deduplication Engine", s['cell']), Paragraph("Canonical domain hashing, database unique constraints, and bloom filtering preventing duplicate accounts across runs.", s['cell']), Paragraph("Verified", s['cell_bold'])],
        [Paragraph("FR-10", s['cell_bold']), Paragraph("Live Streaming Progress", s['cell']), Paragraph("Server-Sent Events streaming real-time scraping counts, leads ingested, and duplicates dropped.", s['cell']), Paragraph("Verified", s['cell_bold'])],
    ]
    t_fr = Table(fr_data, colWidths=[36, 95, 350, 59])
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

    story.append(Paragraph("4. Non-Functional Requirements (NFR)", s['h1']))
    story.append(Paragraph(
        "• <b>Performance:</b> Sub-second dashboard loading (&lt;150 ms) across 1,000–5,000 records; profiling throughput &gt;15 domains/minute; memory footprint strictly <b>&lt; 450 MB RAM</b> on Apple Silicon.<br/>"
        "• <b>Data Sovereignty:</b> 100% of intelligence stored locally in `gtm.db`; zero telemetry or contact exfiltration to external clouds; full DPDP compliance.<br/>"
        "• <b>Reliability:</b> SQLite in WAL mode supporting concurrent UI reads and background worker writes; resilient 5-second timeouts with error suppression.",
        s['body']
    ))
    story.append(Spacer(1, 6))

    add_signoff_block(story, s)

    doc.build(story, canvasmaker=create_canvas_factory("AIVI GTM OPERATING SYSTEM (AIVI GTM OS)", "Product Requirements Document (PRD v1.0)"))
    print(f"PRD PDF successfully built: {filename}")

# -------------------------------------------------------------
# 3. BUILD TRD PDF
# -------------------------------------------------------------
def build_trd_pdf(filename=None):
    if filename is None:
        filename = os.path.join(BASE_DIR, "03_AIVI_GTM_OS_Technical_Requirements_Document_TRD.pdf")
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(filename, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=46, bottomMargin=46)
    s = get_shared_styles()
    story = []

    meta = [
        [Paragraph("<b>Doc ID:</b> AIVI-GTM-OS-TRD-V1.0", s['meta']), Paragraph("<b>Lead Architect:</b> GTM Engineering", s['meta']), Paragraph("<b>Runtime RAM:</b> &lt; 450 MB", s['meta'])],
        [Paragraph("<b>Version:</b> 1.0 Operational Baseline", s['meta']), Paragraph("<b>Primary Operator:</b> Rishikesh Raj (COO)", s['meta']), Paragraph("<b>Database:</b> SQLite 3.54 (WAL)", s['meta'])],
        [Paragraph("<b>Date:</b> 12 November 2026", s['meta']), Paragraph("<b>Executive Reviewer:</b> Abhishek Mishra (CEO)", s['meta']), Paragraph("<b>SaaS Cost:</b> <b>₹0 / Month</b>", s['meta'])]
    ]
    add_header_block(story, "Personal GTM Operating System (AIVI GTM OS)", "Document 3: Technical Requirements Document (TRD) — Version 1.0 Finalized Baseline", "TRD-V1.0", meta, s)

    story.append(Paragraph("1. Technical Architecture & System Topology", s['h1']))
    story.append(Paragraph(
        "The AIVI GTM OS is implemented as a local-first, low-latency, modular monolith designed for Apple Silicon hardware:<br/>"
        "• <b>Frontend Tier (Port 3000):</b> Next.js 14.2 App Router, TypeScript, Tailwind CSS, Lucide icons, responsive review modal, and live outbox queue.<br/>"
        "• <b>Backend Tier (Port 8000):</b> FastAPI 0.110+ ASGI service running Uvicorn, Pydantic v2 schemas, SQLAlchemy ORM, and background crawler executors.<br/>"
        "• <b>Database Tier:</b> SQLite 3 with Write-Ahead Logging (`PRAGMA journal_mode=WAL`) ensuring lock-free concurrency between reads and scraping writes.<br/>"
        "• <b>Sovereign Services:</b> `SovereignDiscoveryService`, `SovereignPeopleExtractor`, `SovereignPatternEngine`, and `SovereignEnrichmentService` utilizing `httpx`, `BeautifulSoup4`, `dnspython`, and native socket handshakes.",
        s['body']
    ))

    story.append(Paragraph("2. Database Schema Specifications", s['h1']))
    schema_data = [
        [Paragraph("Table Name", s['header']), Paragraph("Key Columns & Data Types", s['header']), Paragraph("Indexes & Constraints", s['header']), Paragraph("Functional Purpose", s['header'])],
        [Paragraph("workspaces", s['cell_bold']), Paragraph("id (UUID), name (VARCHAR), icp (TEXT), created_at", s['cell']), Paragraph("PRIMARY KEY (id)", s['cell']), Paragraph("Workspace partitioning and settings", s['cell'])],
        [Paragraph("leads", s['cell_bold']), Paragraph("id, domain, company, contact_name, title, email, phone, wa_link, pricing_tier, price_inr, deal_status, stage", s['cell']), Paragraph("UNIQUE (domain), UNIQUE (email), INDEX (status)", s['cell']), Paragraph("Core lead directory & financial records", s['cell'])],
        [Paragraph("email_candidates", s['cell_bold']), Paragraph("id, lead_id (FK), email, pattern_used, deliverability, status", s['cell']), Paragraph("FOREIGN KEY (lead_id), INDEX (lead_id)", s['cell']), Paragraph("Derived candidate email permutations", s['cell'])],
        [Paragraph("email_drafts", s['cell_bold']), Paragraph("id, lead_id (FK), stage_name, subject, body, hooks", s['cell']), Paragraph("FOREIGN KEY (lead_id)", s['cell']), Paragraph("5-stage sequential outreach copies", s['cell'])],
        [Paragraph("discovery_runs", s['cell_bold']), Paragraph("id, city, niche, requested, discovered, duplicates_skipped, status", s['cell']), Paragraph("PRIMARY KEY (id), INDEX (city, niche)", s['cell']), Paragraph("Deduplication run logs & offset tracking", s['cell'])],
    ]
    t_schema = Table(schema_data, colWidths=[65, 175, 125, 175])
    t_schema.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_schema)
    story.append(Spacer(1, 4))

    story.append(Paragraph("3. Sourcing, Scraping & Extraction Algorithms", s['h1']))
    algs = [
        "<b>OpenStreetMap Overpass QL:</b> Queries nodes matching `office=it`, `office=company`, `craft=web_developer` within specified city bounds. Filters aggregators via `JUNK_DOMAIN_PATTERNS` regex and normalizes domains via `normalize_canonical_domain()`.",
        "<b>3-Request Profiler (`profile.py`):</b> Issues GET `/`, `/robots.txt`, and `/sitemap.xml` (or `/contact`). Identifies tech stacks (WordPress, Webflow, React, Next.js), ad tracking pixels (Meta Pixel, Google Tag Manager), and footer agency signatures ('Website by').",
        "<b>People Extraction Engine (`people.py`):</b> Crawls up to 6 internal links (`/about`, `/team`, `/leadership`). Tokenizes HTML card elements, parses prose sentences, and reads JSON-LD &lt;script&gt; for Schema.org `founder`/`employee` tags. Filters headings via `COMMON_WORDS`.",
        "<b>Pattern Derivation & Deliverability (`email_finder.py`):</b> Resolves DNS MX records to classify providers (Google Workspace, M365, Gateways, Self-Hosted). Derives email syntax (`{f}.{l}`, `{f}`, `{fi}{l}`) from public addresses and probes mailboxes via RFC 5321.",
        "<b>Sovereign Phone Intelligence (`sovereign_enrichment_service.py`):</b> Inspects DOM anchors for direct `wa.me/` links (100% confidence), regex-extracts Indian 10-digit mobile series (`+91 [6-9]`), separates landlines, and implements corporate suffix fallback (`softerectorllp.com` -> `softerector.com`)."
    ]
    for a in algs:
        story.append(Paragraph(f"• {a}", s['bullet']))
    story.append(Spacer(1, 4))

    story.append(Paragraph("4. Deduplication Protocol (Preventing Collisions in 2,000+ Batches)", s['h1']))
    story.append(Paragraph(
        "The system guarantees zero duplicate records when expanding from 1,000 to 2,000+ leads through 4 enforced layers:<br/>"
        "1. <b>Canonical Domain Normalization:</b> Strips protocols, `www.`, and query strings to produce bare hostnames (`studio.in`).<br/>"
        "2. <b>SQLite Unique Indexes:</b> `ix_leads_company_domain` and `ix_leads_email` abort duplicate database insertions automatically.<br/>"
        "3. <b>Pre-Crawl Bloom Filter:</b> Loads existing database domains into an in-memory set, skipping HTTP requests for previously contacted accounts.<br/>"
        "4. <b>Discovery Run Logging:</b> Every batch logs pagination offsets in `discovery_runs` to ensure geographic and SERP queries crawl net-new segments.",
        s['body']
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("5. Complete REST API Reference", s['h1']))
    api_data = [
        [Paragraph("Method", s['header']), Paragraph("Endpoint Path", s['header']), Paragraph("Description & Parameters", s['header']), Paragraph("Response Payload", s['header'])],
        [Paragraph("POST", s['cell_bold']), Paragraph("/api/discovery/generate-leads", s['cell']), Paragraph("Initiates autonomous OSM & SERP sourcing pass", s['cell']), Paragraph("{ run_id, status: 'started' }", s['cell'])],
        [Paragraph("GET", s['cell_bold']), Paragraph("/api/discovery/runs/{id}", s['cell']), Paragraph("Polls progress of active discovery run", s['cell']), Paragraph("{ status, progress, new_leads }", s['cell'])],
        [Paragraph("GET", s['cell_bold']), Paragraph("/api/leads", s['cell']), Paragraph("Paginated leads query with search and status filters", s['cell']), Paragraph("{ total, leads: [...] }", s['cell'])],
        [Paragraph("GET", s['cell_bold']), Paragraph("/api/leads/{id}", s['cell']), Paragraph("Full lead dossier, email candidates, and 5-stage drafts", s['cell']), Paragraph("{ lead, candidates, drafts }", s['cell'])],
        [Paragraph("PUT", s['cell_bold']), Paragraph("/api/leads/{id}/deal-status", s['cell']), Paragraph("Updates deal status and recalculates pipeline metrics", s['cell']), Paragraph("{ status: 'success', lead }", s['cell'])],
        [Paragraph("PUT", s['cell_bold']), Paragraph("/api/leads/{id}/select-email", s['cell']), Paragraph("Selects active work email from candidate list", s['cell']), Paragraph("{ status: 'success', selected_email }", s['cell'])],
        [Paragraph("POST", s['cell_bold']), Paragraph("/api/leads/{id}/sovereign-enrich", s['cell']), Paragraph("Auto-enriches existing lead with verified phone in SQLite", s['cell']), Paragraph("{ status: 'success', phone }", s['cell'])],
        [Paragraph("POST", s['cell_bold']), Paragraph("/api/leads/sovereign-lookup", s['cell']), Paragraph("Standalone lookup for arbitrary domain without DB write", s['cell']), Paragraph("{ status: 'success', enrichment }", s['cell'])],
        [Paragraph("GET", s['cell_bold']), Paragraph("/api/leads/export/excel", s['cell']), Paragraph("Generates 2-sheet formatted Microsoft Excel workbook", s['cell']), Paragraph("Binary .xlsx stream", s['cell'])],
        [Paragraph("GET", s['cell_bold']), Paragraph("/api/stats/overview", s['cell']), Paragraph("Returns live aggregate metrics (MRR, ARR, Lost, Outbox)", s['cell']), Paragraph("{ estimated_mrr, lost_mrr, ... }", s['cell'])]
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
    story.append(Spacer(1, 5))

    add_signoff_block(story, s)

    doc.build(story, canvasmaker=create_canvas_factory("AIVI GTM OPERATING SYSTEM (AIVI GTM OS)", "Technical Requirements Document (TRD v1.0)"))
    print(f"TRD PDF successfully built: {filename}")

if __name__ == "__main__":
    build_sow_pdf()
    build_prd_pdf()
    build_trd_pdf()
