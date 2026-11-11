# Personal GTM Operating System — Architectural Decisions Log

This log documents key architectural decisions, rationale, trade-offs, and invariants enforced across the codebase.

---

### ADR 001: Local-First Apple Silicon Deployment with ₹0 SaaS Subscriptions
- **Status:** Accepted
- **Context:** Commercial GTM stacks (Apollo, Clay paid waterfalls, Instantly, Smartlead, ZeroBounce) incur $200–$500/month recurring overhead. The user's workstation is an Apple Silicon M-series machine with 8 GB unified memory.
- **Decision:** Build a lightweight, local-first system using FastAPI + SQLite on the backend and Next.js + Tailwind CSS on the frontend. Paid third-party APIs remain disabled by default.
- **Consequences:** Low memory footprint (< 1 GB RAM total), zero recurring costs, complete ownership of prospect data, zero API rate-limit surprises.

---

### ADR 002: In-House RFC 5321 Port 25 SMTP Handshake Engine
- **Status:** Accepted
- **Context:** Email verification via ZeroBounce, NeverBounce, or Hunter charges per verification. Most modern mail transfer agents respond to standard SMTP envelope probes (`HELO`/`EHLO` ➔ `MAIL FROM` ➔ `RCPT TO`).
- **Decision:** Implement an in-house DNS MX resolver (`dnspython`) and direct socket-level SMTP handshake (`250 OK` probe) without sending the final `DATA` command. Include catch-all detection by probing a random address (`xyzrandomnonexistent@domain.com`).
- **Consequences:** Eliminates paid verification subscriptions while safely identifying valid mailboxes. Handles residential ISP Port 25 blocks with graceful degradation and DNS fallback status.

---

### ADR 003: Product-Agnostic Workspace Schema
- **Status:** Accepted
- **Context:** The current target product is HackMyWebsite (`https://hackmywebsite.io/`), but the architecture must serve AiVi Campus OS and any future internal or client venture without schema refactoring.
- **Decision:** Model all campaigns, leads, pain points, value propositions, and email templates under a `ProductWorkspace` entity with a foreign key relationship to all downstream artifacts.
- **Consequences:** Seamless 1-click workspace switching in the UI with strict tenant isolation.

---

### ADR 004: Two-Way LinkedIn Framework
- **Status:** Accepted
- **Context:** Cold outreach response rates depend 50% on prospect targeting and 50% on sender authority. When a prospect receives an email, their first action is searching the sender on LinkedIn.
- **Decision:** Build an Operator Profile Studio that audits the operator's LinkedIn headline, banner, and about section, alongside prospect profile analysis.
- **Consequences:** Bridges the trust gap before outbound campaigns launch.

---

### ADR 005: Mandatory Human-in-the-Loop Pre-Dispatch Gate
- **Status:** Accepted
- **Context:** Fully automated autonomous outreach risks sending inaccurate, hallucinated, or embarrassing emails that burn domain reputation.
- **Decision:** Outbound dispatch requires explicit operator review and confirmation in the UI. Zero automated background email sending without human approval.
- **Consequences:** 100% deliverability safety and zero hallucinated claims sent to prospects.
