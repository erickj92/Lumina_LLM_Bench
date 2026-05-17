"""Lumina Bench — FastAPI Backend Entry Point

A lightweight API for user authentication and anonymous result aggregation.
Provides JWT-based auth, SQLite storage, and global stats endpoints.

Run with:
    uvicorn main:app --reload
"""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import httpx

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


# ── Ollama Cloud proxy ────────────────────────────────────────────────────
# Proxies requests to https://ollama.com to avoid CORS issues in production.
# The browser talks to the same origin (our backend), which forwards to ollama.com.

OLLAMA_CLOUD_BASE = "https://ollama.com"


@app.api_route("/proxy/ollama/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def proxy_ollama(path: str, request: Request):
    """
    Proxy requests to ollama.com, passing through Authorization headers.
    Used by the frontend in production to bypass ollama.com's missing CORS headers.
    """
    target_url = f"{OLLAMA_CLOUD_BASE}/{path}"
    logger.info("[ollama-proxy] Proxying %s %s", request.method, target_url)

    # Extract headers to forward (strip host-specific ones)
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in ("host", "content-length", "transfer-encoding", "connection")
    }

    body = await request.body() if request.method in ("POST", "PUT", "PATCH") else None

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )

            # For streaming responses (chat completions), use StreamingResponse
            content_type = response.headers.get("content-type", "")
            if content_type.startswith("application/x-ndjson"):
                async def stream():
                    async for chunk in response.aiter_bytes():
                        yield chunk

                return StreamingResponse(
                    stream(),
                    status_code=response.status_code,
                    media_type="application/x-ndjson",
                )

            # For regular responses (model listing, etc.)
            return JSONResponse(
                content=response.json() if response.text else {},
                status_code=response.status_code,
            )

        except httpx.RequestError as e:
            logger.exception("[ollama-proxy] Request failed: %s", e)
            return JSONResponse(
                content={"error": f"Ollama proxy request failed: {str(e)}"},
                status_code=502,
            )


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