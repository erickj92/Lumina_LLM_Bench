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
    # Determine whether the target endpoint returns NDJSON (streaming) or
    # regular JSON.  Ollama's /api/chat and /api/generate return NDJSON;
    # all other endpoints (e.g. /api/tags) return plain JSON.
    is_streaming = (
        request.method == "POST"
        and "/api/chat" in target_url
    ) or (
        request.method == "POST"
        and "/api/generate" in target_url
    )

    async with httpx.AsyncClient(timeout=_OLLAMA_PROXY_TIMEOUT) as client:
        try:
            req = client.build_request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )

            # ── Case 1: NDJSON streaming (chat completions) ──────────────
            if is_streaming:
                # Use a fresh client for streaming to avoid connection pool issues
                stream_client = httpx.AsyncClient(
                    timeout=_OLLAMA_PROXY_TIMEOUT,
                    limits=httpx.Limits(max_keepalive_connections=0, max_connections=1),
                )
                response = await stream_client.send(req, stream=True)

                logger.info(
                    "[ollama-proxy] <<< %s %s returned %s  (streaming)",
                    request.method,
                    request.url.path,
                    response.status_code,
                )

                async def _stream_ndjson():
                    chunk_count = 0
                    total_bytes = 0
                    logger.info(
                        "[ollama-proxy] Streaming NDJSON started for %s",
                        request.url.path,
                    )
                    try:
                        async for chunk in response.aiter_bytes():
                            if not chunk:
                                continue
                            chunk_count += 1
                            total_bytes += len(chunk)
                            logger.debug(
                                "[ollama-proxy] Chunk #%d: %d bytes (total: %d)",
                                chunk_count,
                                len(chunk),
                                total_bytes,
                            )
                            yield chunk
                        logger.info(
                            "[ollama-proxy] Streaming NDJSON finished: "
                            "%d chunks, %d total bytes",
                            chunk_count,
                            total_bytes,
                        )
                    except httpx.ReadError as read_err:
                        # Connection closed by upstream - this can happen normally
                        # for long-running streams. Log it but don't crash.
                        logger.warning(
                            "[ollama-proxy] Stream connection closed after "
                            "%d chunks / %d bytes (this is normal for long streams): %s",
                            chunk_count,
                            total_bytes,
                            read_err,
                        )
                        # Stream ends gracefully
                    except Exception as chunk_err:
                        logger.exception(
                            "[ollama-proxy] Chunk streaming error after "
                            "%d chunks / %d bytes: %s",
                            chunk_count,
                            total_bytes,
                            chunk_err,
                        )
                        # Re-raise other errors
                        raise
                    finally:
                        # Ensure client is closed after stream ends
                        await stream_client.aclose()

                return StreamingResponse(
                    _stream_ndjson(),
                    status_code=response.status_code,
                    media_type="application/x-ndjson",
                )

            # ── Case 2: Regular JSON responses (model listing, etc.) ──────
            response = await client.send(req)  # NOT streaming

            logger.info(
                "[ollama-proxy] <<< %s %s returned %s  (content-type: %s)",
                request.method,
                request.url.path,
                response.status_code,
                response.headers.get("content-type", "?"),
            )

            try:
                data = response.json()
            except Exception as json_err:
                # response.json() has already read and buffered the body
                raw_text = response.text
                logger.warning(
                    "[ollama-proxy] Non-JSON response body: %s",
                    raw_text[:500],
                )
                data = {"text": raw_text}

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