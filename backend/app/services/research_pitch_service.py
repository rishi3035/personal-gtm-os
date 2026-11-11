import json
import logging
import re
from typing import Dict, Any, List
from app.models.lead import Lead
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)

class ResearchPitchService:
    @staticmethod
    def classify_lead_segment(lead: Lead) -> str:
        """
        Classifies lead into one of the 3 proven segment strategies from session 0f9221c6-4e53-46d6-8cde-c1787c0be2b9:
        1. 'agency': Web & App Development Studios, Infotech, Digital Consultancies
        2. 'ecommerce': Ecommerce Studios, Shopify / Headless Platforms
        3. 'boutique': Founder-led AI/Tech Studios, Solo Founders & SaaS Startups
        """
        company_lower = (lead.company_name or "").lower()
        title_lower = (lead.job_title or "").lower()

        if any(w in company_lower for w in ["shopify", "commerce", "store", "retail", "cart", "brand"]):
            return "ecommerce"
        elif any(w in company_lower for w in [
            "agency", "studio", "infotech", "technologies", "techstack",
            "solutions", "services", "digital", "consulting", "interactive",
            "media", "software", "development", "it services", "enterprises"
        ]):
            return "agency"
        else:
            return "boutique"

    @classmethod
    def generate_research_pitch(cls, lead: Lead, workspace: Workspace) -> Dict[str, Any]:
        """
        Synthesizes research and generates the high-converting 6-block cold email strategy
        calibrated directly from session 0f9221c6-4e53-46d6-8cde-c1787c0be2b9.
        """
        full_name = (lead.full_name or "").strip()
        first_name = (lead.first_name or (full_name.split()[0] if full_name else "there")).strip()
        company = (lead.company_name or "your team").strip()
        domain = (lead.company_domain or f"{company.lower().replace(' ', '')}.com").strip()
        title = (lead.job_title or "tech leader").strip()
        
        segment = cls.classify_lead_segment(lead)

        if segment == "ecommerce":
            subject = f"Custom code security and retainer profit for {company}"
            hook = f"Really impressed with the scalable web applications and digital commerce systems your team builds at {company}."
            problem = (
                f"Quick question for you. When your developers build fast and integrate custom APIs, plugins, "
                f"or headless storefronts, how do you handle security validation before client handoff?\n\n"
                f"Even with great QA, small perimeter vulnerabilities, open endpoints, and header gaps easily "
                f"slip into production, putting client data at risk."
            )
            solution = (
                f"We built Hack My Website (https://hackmywebsite.io) to slot directly into your delivery pipeline: "
                f"development, QA, five minute automated scan, Launch Score, and client handoff.\n\n"
                f"It flags perimeter risks in seconds and gives your team ready prompts to copy-paste into Cursor or Claude "
                f"to patch things immediately."
            )
            profit = (
                f"The big win for {company} is pure profit:\n\n"
                f"1. One Time Handover Profit: You brand the audit PDF with your own logo and sell it as a certified launch security clearance for an extra ₹30,000 to ₹50,000 on the final project invoice.\n"
                f"2. Recurring Retainer Profit: You roll it into your monthly maintenance packages as continuous security monitoring for ₹20,000 to ₹40,000 monthly, with zero extra engineering headcount."
            )
            cta = "Attached is our 1-page overview memo. Would you be open to a quick 5 to 10 minute call this Thursday or Friday to see a sample white label report?"
            category = "Ecommerce & Digital Solutions Studio"
            pitch_angle = "Headless Custom Code Security & Retainer Monetization"

        elif segment == "boutique":
            subject = f"Automated security validation before client handover at {company}"
            hook = f"Love what you and the team are shipping as a focused engineering team at {company}."
            problem = (
                f"Quick question for you. When your developers build fast with AI coding tools like Cursor or Claude, "
                f"how do you handle perimeter security before deployment?\n\n"
                f"Hiring an outside penetration tester makes zero sense for a high-velocity team: it costs ₹1.5L to ₹5.0L "
                f"($2,000+), takes 2 to 3 weeks, and yields 50-page reports that developers never read."
            )
            solution = (
                f"We built Hack My Website (https://hackmywebsite.io) to solve this in five minutes.\n\n"
                f"You run an automated scan on staging in under 90 seconds, catch OWASP Top 10 risks and exposed secrets, "
                f"and get ready prompts to copy-paste into Cursor or Claude to patch them immediately."
            )
            profit = (
                f"For client work, you can brand the audit PDF with your own logo as a verified Launch Security Clearance, "
                f"adding an instant ₹30,000 to ₹50,000 in delivery margin or monthly retainers."
            )
            cta = "Attached is our 1-page overview memo. Would you be up for a brief 5 to 10 minute catch up Thursday or Friday to see how it works?"
            category = "High-Velocity Tech & Product Studio"
            pitch_angle = "AI Code Risk Elimination & 90-Second IDE Prompts"

        else: # Standard Agency / Infotech / Dev Studio
            subject = f"Turning web client handoffs into ₹50k/mo recurring agency revenue"
            hook = f"Really like the custom web applications and client builds your team ships at {company}."
            problem = (
                f"Quick question for you. When your developers build fast and copy-paste code from Claude or integrate third party plugins, "
                f"how do you handle security validation before client handoff?\n\n"
                f"Even with great QA, small perimeter vulnerabilities, open endpoints, and header gaps easily slip into production, "
                f"putting client data at risk."
            )
            solution = (
                f"We built Hack My Website (https://hackmywebsite.io) to slot directly into your delivery pipeline: "
                f"development, QA, five minute automated scan, Launch Score, and client handoff.\n\n"
                f"It flags perimeter risks in seconds and gives your team ready prompts to copy-paste into Cursor or Claude "
                f"to patch things immediately."
            )
            profit = (
                f"The big win for {company} is pure profit:\n\n"
                f"1. One Time Handover Profit: You brand the audit PDF with your own logo and sell it as a certified launch security clearance for an extra ₹30,000 to ₹50,000 on the final project invoice.\n"
                f"2. Recurring Retainer Profit: You roll it into your monthly maintenance packages as continuous security monitoring for ₹20,000 to ₹40,000 monthly, with zero extra engineering headcount."
            )
            cta = "Attached is our 1-page overview memo. Would you be open to a quick 5 to 10 minute call this Thursday or Friday to see a sample white label report?"
            category = "Web & App Development Agency"
            pitch_angle = "Agency White-Label Security Handover Engine (₹50k/mo Upsell)"

        # Assemble full authentic human-written body text
        body_text = (
            f"Hi {first_name},\n\n"
            f"{hook}\n\n"
            f"{problem}\n\n"
            f"{solution}\n\n"
            f"{profit}\n\n"
            f"{cta}\n\n"
            f"Best regards,\n\n"
            f"Rishikesh Raj\n"
            f"Chief Operating Officer\n"
            f"AIVI Intelligence Private Limited\n"
            f"E: rishikesh@aiviintelligence.com\n"
            f"W: https://aiviintelligence.com | https://hackmywebsite.io"
        )

        dossier = {
            "category": category,
            "segment": segment,
            "business_model": "Client Project Delivery & Tech Infrastructure",
            "pitch_angle": pitch_angle,
            "target_domain": domain,
            "executive_focus": f"Delivery margins, client data protection, and white-label retainer revenue for {title}.",
            "findings": [
                f"Company segment: {category} ({company})",
                f"Primary monetization angle: {pitch_angle}",
                f"Remediation hook: Automated 90-sec DAST/SAST scan + 1-click Cursor/Claude AST prompt fixes",
                f"Agency upsell capability: ₹30,000–₹50,000 one-time clearance fee + ₹20,000–₹40,000/mo retainer"
            ],
            "recommended_next_step": "Dispatch outreach pitch via email client or GTM OS review gate"
        }

        return {
            "dossier": dossier,
            "pitch_email": {
                "recipient": lead.email,
                "subject": subject,
                "body_text": body_text,
                "hook_rationale": f"Calibrated 6-block B2B strategy for {segment}: {pitch_angle}"
            }
        }
