"""
ScamShield — FastAPI Entry Point
Registers all routers and configures CORS middleware.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api import auth, detect, reports, analytics, awareness, quiz, forum

settings = get_settings()

app = FastAPI(
    title="ScamShield API",
    description=(
        "AI-Powered Online Scam Detection and Awareness Platform. "
        "Combines Google Gemini AI with VirusTotal security intelligence."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────────────────
# CORS — origins are managed via ALLOWED_ORIGINS env var.
# Update that variable manually in your .env file.
# ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# Routers — all prefixed under /api/v1
# ─────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router,      prefix=API_PREFIX)
app.include_router(detect.router,    prefix=API_PREFIX)
app.include_router(reports.router,   prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(awareness.router, prefix=API_PREFIX)
app.include_router(quiz.router,      prefix=API_PREFIX)
app.include_router(forum.router,     prefix=API_PREFIX)


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "ScamShield API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
