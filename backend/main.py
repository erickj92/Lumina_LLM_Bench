"""Lumina Bench — FastAPI Backend Entry Point

A lightweight API for user authentication and anonymous result aggregation.
Provides JWT-based auth, SQLite storage, and global stats endpoints.

Run with:
    uvicorn main:app --reload
"""

import logging
import os
import traceback

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

# Maximum time (seconds) for an upstream request before timing out.
# Increased for streaming benchmark runs that can take much longer than 60s.
_OLLAMA_PROXY_TIMEOUT = float(os.getenv("OLLAMA_PROXY_TIMEOUT", "300"))


def _sanitize_headers(headers: dict[str, str]) -> dict[str, str]:
    """Return a copy of headers with any API-key values masked for logging."""
    safe = {}
    for k, v in headers.items():
        if k.lower() == "authorization":
            # Mask the token portion, keep the Bearer scheme
            safe[k] = v[:15] + "..." + v[-4:] if len(v) > 20 else "Bearer ****"
        elif k.lower() in ("x-api-key", "api-key"):
            safe[k] = v[:6] + "..."
        else:
            safe[k] = v
    return safe


@app.api_route("/proxy/ollama/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def proxy_ollama(path: str, request: Request):
    """
    Proxy requests to ollama.com, passing through Authorization headers.
    Used by the frontend in production to bypass ollama.com's missing CORS headers.
    """
    target_url = f"{OLLAMA_CLOUD_BASE}/{path}"

    # ── Log incoming request details ───────────────────────────────────────
    logger.info(
        "[ollama-proxy] >>> %s %s  ->  %s",
        request.method,
        request.url.path,
        target_url,
    )

    # Build forwarding headers (strip hop-by-hop headers)
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in ("host", "content-length", "transfer-encoding", "connection")
    }

    # Log sanitized headers for debugging
    safe_headers = _sanitize_headers(dict(headers))
    logger.debug("[ollama-proxy] Forwarding headers: %s", safe_headers)

    # Read request body (POST/PUT/PATCH only)
    body = await request.body() if request.method in ("POST", "PUT", "PATCH") else None
    if body:
        logger.debug(
            "[ollama-proxy] Request body (%d bytes): %s",
            len(body),
            body[:800].decode("utf-8", errors="replace"),
        )
    else:
        logger.debug("[ollama-proxy] No request body")

    # ── Forward the request ────────────────────────────────────────────────
    async with httpx.AsyncClient(timeout=_OLLAMA_PROXY_TIMEOUT) as client:
        try:
            # Use build_request + send(stream=True) so NDJSON streaming responses
            # are forwarded chunk-by-chunk instead of being fully buffered first.
            req = client.build_request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )

            response = await client.send(req, stream=True)

            logger.info(
                "[ollama-proxy] <<< %s %s returned %s  (content-type: %s)",
                request.method,
                request.url.path,
                response.status_code,
                response.headers.get("content-type", "?"),
            )

            # ── Streaming (NDJSON) responses — chat completions ──────────
            content_type = response.headers.get("content-type", "")  # type: ignore[arg-type]
            if "ndjson" in content_type or "x-ndjson" in content_type:
                logger.debug(
                    "[ollama-proxy] Streaming NDJSON response back to client"
                )

                async def _stream_ndjson():
                    try:
                        async for chunk in response.aiter_bytes():
                            yield chunk
                    except Exception as chunk_err:
                        logger.exception(
                            "[ollama-proxy] Chunk streaming error: %s", chunk_err
                        )

                return StreamingResponse(
                    _stream_ndjson(),
                    status_code=response.status_code,
                    media_type="application/x-ndjson",
                )

            # ── Non-streaming responses (model listing, etc.) ────────────
            try:
                data = response.json() if response.text else {}
            except Exception as json_err:
                text_body = await response.aread()
                logger.warning(
                    "[ollama-proxy] Non-JSON response body: %s",
                    text_body[:500].decode("utf-8", errors="replace"),
                )
                data = {"text": text_body.decode("utf-8", errors="replace")}

            # If Ollama returned an error, surface it
            if response.status_code >= 400:
                logger.error(
                    "[ollama-proxy] Upstream error %s: %s",
                    response.status_code,
                    data,
                )

            return JSONResponse(content=data, status_code=response.status_code)

        except httpx.TimeoutException as time_err:
            logger.exception(
                "[ollama-proxy] Timeout after %ss for %s: %s",
                _OLLAMA_PROXY_TIMEOUT,
                target_url,
                time_err,
            )
            return JSONResponse(
                content={
                    "error": f"Ollama proxy timed out after {_OLLAMA_PROXY_TIMEOUT}s. "
                    f"The model might be too slow or the request too long. "
                    f"Try a shorter prompt or smaller model."
                },
                status_code=504,
            )

        except httpx.RequestError as req_err:
            logger.exception(
                "[ollama-proxy] Request failed for %s: %s",
                target_url,
                req_err,
            )
            return JSONResponse(
                content={
                    "error": f"Ollama proxy could not reach the upstream server: {str(req_err)}"
                },
                status_code=502,
            )

        except Exception as exc:
            # Catch-all: log full traceback for unexpected errors
            tb = traceback.format_exc()
            logger.error(
                "[ollama-proxy] Unhandled exception proxying %s:\n%s",
                target_url,
                tb,
            )
            return JSONResponse(
                content={
                    "error": f"Internal proxy error: {type(exc).__name__}: {str(exc)}"
                },
                status_code=500,
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