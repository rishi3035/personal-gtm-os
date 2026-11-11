import json
import logging
import re
from typing import Dict, Any, List
from app.models.lead import Lead
from app.models.workspace import Workspace
from app.models.email import EmailDraft

logger = logging.getLogger(__name__)

class ResearchPitchService:
    @staticmethod
    def analyze_company_and_role(lead: Lead) -> Dict[str, Any]:
        """
        Synthesizes research intelligence about the lead's company, industry, and role.
        Determines the optimal DevSecOps / HackMyWebsite pitch angle.
        """
        company = (lead.company_name or "").strip()
        domain = (lead.company_domain or "").strip()
        title = (lead.job_title or "").strip()
        full_name = (lead.full_name or "").strip()
        first_name = (lead.first_name or (full_name.split()[0] if full_name else "there")).strip()
        
        comp_lower = company.lower()
        title_lower = title.lower()

        # Classify business model
        if any(w in comp_lower for w in ["agency", "studio", "infotech", "technologies", "techstack", "solutions", "services", "digital", "consulting", "interactive", "media"]):
            category = "Digital Agency & Software Services"
            business_model = "Client Web & App Development"
            security_risk = "Shipping client web applications on tight sprint schedules where manual pen-testing is skipped due to high cost ($3,000+) and slow turnaround."
            angle = "Agency Client Security Assurance & Rapid Staging Scans"
            cta_prompt = f"run a test vulnerability scan on one of {company}'s client staging or production URLs"
        elif any(w in comp_lower for w in ["ai", "labs", "tech", "box", "peers", "ctc", "push", "flow", "saas", "app"]):
            category = "Tech Startup / B2B SaaS"
            business_model = "Product & Platform Engineering"
            security_risk = "Exposing sensitive customer data or APIs through rapid continuous deployments without automated CI/CD security gates."
            angle = "Autonomous GitHub PR Security Gate & DAST Scanning"
            cta_prompt = f"benchmark {domain or company}'s web endpoints in under 90 seconds"
        else:
            category = "Technology Business"
            business_model = "Commercial Web Infrastructure"
            security_risk = "Unpatched web vulnerabilities, misconfigured CORS/CSP headers, and exposed staging subdomains."
            angle = "OWASP Top 10 Continuous Defense"
            cta_prompt = f"see a complimentary baseline vulnerability report for {domain or company}"

        # Classify executive perspective
        if any(w in title_lower for w in ["coo", "chief operating officer", "operations"]):
            executive_focus = "Operational efficiency, reducing delivery risk, and avoiding client breach liability."
        elif any(w in title_lower for w in ["cto", "chief technology officer", "vp engineering", "head of tech", "technical"]):
            executive_focus = "Developer workflow integration, GitHub PR gates, and zero-overhead DAST/SAST automation."
        elif any(w in title_lower for w in ["founder", "ceo", "co-founder", "director", "managing director", "partner"]):
            executive_focus = "Safeguarding company brand reputation, client trust, and closing enterprise deals with proof of security."
        else:
            executive_focus = "Automated web application security auditing with zero engineering friction."

        findings = [
            f"Company operates in {category} with primary focus on {business_model}.",
            f"Key operational friction: {security_risk}",
            f"Executive vantage ({title}): Prioritizes {executive_focus}",
            f"Recommended Attack Surface target: {domain if domain else company.lower().replace(' ', '') + '.com'}"
        ]

        return {
            "first_name": first_name,
            "company_name": company,
            "domain": domain,
            "category": category,
            "business_model": business_model,
            "angle": angle,
            "executive_focus": executive_focus,
            "security_risk": security_risk,
            "cta_prompt": cta_prompt,
            "key_findings": findings
        }

    @classmethod
    def generate_research_pitch(cls, lead: Lead, workspace: Workspace) -> Dict[str, Any]:
        """
        Generates research dossier and a ready-to-send HackMyWebsite pitch email.
        """
        analysis = cls.analyze_company_and_role(lead)
        first_name = analysis["first_name"]
        company = analysis["company_name"]
        domain = analysis["domain"] or f"{company.lower().replace(' ', '')}.com"
        title = lead.job_title or "tech leader"

        # Construct authentic, human-written pitch email
        subject = f"{company}'s client web builds & automated security"
        
        body_text = (
            f"Hi {first_name},\n\n"
            f"Saw your work leading {company}. As {title}, I imagine keeping web applications secure before "
            f"deployments is a recurring priority—especially when client deadlines are tight.\n\n"
            f"Most teams we speak with tell us traditional penetration testing has become a major bottleneck: "
            f"it costs $3,000+ per manual engagement and takes 2 to 3 weeks to get results. Because of that delay, "
            f"staging endpoints and production releases often go live with unverified OWASP risks or misconfigured headers.\n\n"
            f"We built HackMyWebsite (https://hackmywebsite.io) to solve this. It is an autonomous DevSecOps scanner "
            f"that crawls and runs full DAST and SAST vulnerability scans across web builds in under 90 seconds, "
            f"giving you instant remediation steps without needing dedicated security staff.\n\n"
            f"Would you be open to running a quick test scan on one of {company}'s staging or public URLs to see "
            f"what it surfaces?\n\n"
            f"Best,\n"
            f"Rishikesh Raj\n"
            f"COO, AIVI Intelligence | HackMyWebsite\n"
            f"rishikesh@aiviintelligence.com | https://hackmywebsite.io"
        )

        dossier = {
            "category": analysis["category"],
            "business_model": analysis["business_model"],
            "pitch_angle": analysis["angle"],
            "target_domain": domain,
            "executive_focus": analysis["executive_focus"],
            "findings": analysis["key_findings"],
            "recommended_next_step": "Dispatch initial observation pitch via Gmail or SMTP"
        }

        return {
            "dossier": dossier,
            "pitch_email": {
                "recipient": lead.email,
                "subject": subject,
                "body_text": body_text,
                "hook_rationale": f"Targeted at {analysis['angle']} highlighting 90-second automated scans vs $3,000 manual pen-tests."
            }
        }
