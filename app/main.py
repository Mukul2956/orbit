"""
ORBIT – Intelligent Distribution & Scheduling Nexus
FastAPI application entrypoint.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics_router, queue_router, schedule_router, reddit_router
from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "ORBIT is SYNAPSE's intelligent content distribution engine. "
        "It predicts optimal posting times, manages multi-platform queues, "
        "and orchestrates publishing workflows."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS (loosen for hackathon demo; tighten for production) ───────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(queue_router)
app.include_router(schedule_router)
app.include_router(analytics_router)
app.include_router(reddit_router)


# ─── Health / status ─────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "ORBIT", "version": settings.APP_VERSION}


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "ORBIT",
        "description": "Intelligent Distribution & Scheduling Nexus",
        "docs": "/docs",
    }
