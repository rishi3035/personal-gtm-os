import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models import workspace, lead, email, suppression, operator
from app.routers import health, workspaces, clay, leads, email_drafts, suppression as suppression_router, operator as operator_router, discovery

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("personal_gtm_os")

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Local-First Personal GTM Operating System running on macOS (Apple Silicon)"
)

# CORS Middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(health.router)
app.include_router(workspaces.router)
app.include_router(clay.router)
app.include_router(leads.router)
app.include_router(email_drafts.router)
app.include_router(suppression_router.router)
app.include_router(operator_router.router)
app.include_router(discovery.router)

@app.on_event("startup")
def seed_default_data():
    """Seed initial product workspaces if the database is newly initialized."""
    db = SessionLocal()
    try:
        # 1. HackMyWebsite workspace
        hmw = db.query(workspace.Workspace).filter(workspace.Workspace.slug == "hack-my-website").first()
        if not hmw:
            hmw = workspace.Workspace(
                slug="hack-my-website",
                name="HackMyWebsite",
                domain="hackmywebsite.io",
                tagline="Autonomous DevSecOps DAST & SAST Security Scanner",
                target_audience="Digital agencies, web development studios, CTOs, and SaaS founders",
                value_prop=(
                    "Continuous vulnerability scanning for client web builds and staging URLs in under 90 seconds. "
                    "Replaces expensive $3,000+ manual penetration tests with automated OWASP Top 10 detection."
                ),
                pain_points="High pen-testing cost, slow security turnaround before client launches, lack of in-house SecOps",
                is_active=True
            )
            db.add(hmw)

        db.commit()
        logger.info("HackMyWebsite product workspace verified.")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "status": "online"
    }
