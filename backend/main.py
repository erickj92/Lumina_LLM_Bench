"""Lumina Bench — FastAPI Backend Entry Point

A lightweight API for user authentication and anonymous result aggregation.
Provides JWT-based auth, SQLite storage, and global stats endpoints.

Run with:
    uvicorn main:app --reload
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from auth_router import router as auth_router
from results_router import router as results_router

# ── Logging configuration ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("lumina_bench")

# ── Create database tables on startup ─────────────────────────────────────
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified successfully")
except Exception as e:
    logger.exception("Failed to create database tables: %s", e)
    raise

# ── App creation ──────────────────────────────────────────────────────────

app = FastAPI(
    title="Lumina Bench API",
    description="Anonymized LLM benchmarking stats aggregation and Lumina Bench",
    version="0.1.0",
)

# ── CORS — allow configured origins ───────────────────────────────────────
# In production, set CORS_ORIGINS to a comma-separated list (e.g., https://yourdomain.com)
# or use * for any origin (not recommended for production).

_cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
_cors_origins = [o.strip() for o in _cors_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Register routers ─────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(results_router)


@app.get("/")
def root():
    return {
        "app": "Lumina Bench",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}