import logging
from typing import Dict, Any, List
from app.models.lead import Lead
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)

class PersonalizationService:
    @staticmethod
    def generate_drafts_for_lead(lead: Lead, workspace: Workspace) -> List[Dict[str, Any]]:
        """
        Generate Day 0, Day 3, and Day 7 email sequence drafts tailored to the lead and workspace.
        Adheres to authentic human-written principles: concise, direct, zero AI buzzwords.
        """
        first_name = lead.first_name or "there"
        company = lead.company_name or "your team"
        title = lead.job_title or "tech leader"
        
        # Product specifics
        product_name = workspace.name
        product_url = f"https://{workspace.domain}"
        
        drafts = []

        # Day 0: Initial Observation & Direct Value Angle
        day0_subject = f"{company}'s web security & client builds"
        day0_body = (
            f"Hi {first_name},\n\n"
            f"Noticed your work at {company}. As {title}, I imagine keeping client web applications "
            f"and infrastructure secure before deployments is a recurring priority for your team.\n\n"
            f"We built {product_name} ({product_url}) as an autonomous DevSecOps scanner specifically for development "
            f"teams and agencies. It automatically runs DAST and SAST vulnerability scans across web builds and PRs "
            f"without requiring dedicated security ops overhead.\n\n"
            f"Would you be open to running a test scan on one of your public or staging endpoints to see what it surfaces?\n\n"
            f"Best,\n"
            f"Rishikesh\n"
            f"COO, AIVI Intelligence"
        )
        drafts.append({
            "step": 0,
            "subject": day0_subject,
            "body_text": day0_body,
            "hook_rationale": "Role-specific focus on security overhead for agency web builds"
        })

        # Day 3: Concrete Friction / Audit Angle
        day3_subject = f"Quick follow-up re: {company} security scans"
        day3_body = (
            f"Hi {first_name},\n\n"
            f"Following up on my note from earlier this week.\n\n"
            f"Most engineering heads at fast-growing firms tell us their biggest bottleneck with third-party penetration "
            f"testing is turnaround time and cost ($3,000+ per manual audit). {product_name} catches common OWASP Top 10 "
            f"issues, misconfigured headers, and exposed secrets in under 90 seconds.\n\n"
            f"Happy to run a free baseline scan for {company} if you want a sample report for your next sprint review.\n\n"
            f"Let me know if that's relevant right now.\n\n"
            f"Rishikesh"
        )
        drafts.append({
            "step": 1,
            "subject": day3_subject,
            "body_text": day3_body,
            "hook_rationale": "Cost and turnaround bottleneck comparison vs manual pen-testing"
        })

        # Day 7: Polite Breakup & Direct Door Open
        day7_subject = f"Closing the loop: {company}"
        day7_body = (
            f"Hi {first_name},\n\n"
            f"I haven't heard back, so I assume automated web security audits aren't a priority for {company} this quarter.\n\n"
            f"I won't clutter your inbox further. If you ever want to benchmark your client web applications or staging sites, "
            f"you can run a direct scan anytime at {product_url}.\n\n"
            f"Wishing you and the {company} team continued success.\n\n"
            f"Best regards,\n"
            f"Rishikesh Raj\n"
            f"AIVI Intelligence"
        )
        drafts.append({
            "step": 2,
            "subject": day7_subject,
            "body_text": day7_body,
            "hook_rationale": "Respectful breakup email leaving link accessible for future need"
        })

        return drafts
