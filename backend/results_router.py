"""Results submission and retrieval endpoints.

- POST /results/submit  — Submit a benchmark result (anonymous or authenticated)
- GET  /results/global  — Get aggregated global stats by provider/model
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from database import get_db

logger = logging.getLogger("lumina_bench.results")
from models import TestResult
from schemas import TestResultSubmit, TestResultResponse, GlobalStatsResponse, AggregatedStats
from auth import get_optional_user, get_current_user
from models import User
from leaderboard import get_global_stats

router = APIRouter(prefix="/results", tags=["results"])


@router.post("/submit", response_model=TestResultResponse)
def submit_result(
    result: TestResultSubmit,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
):
    """Submit a benchmark result. Accepts both authenticated and anonymous submissions.

    If a valid JWT is provided via the Authorization header, the result is
    linked to the authenticated user. Otherwise, user_id is left null.
    """
    # Try to extract user from token (if present)
    user: Optional[User] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ")
        user = get_optional_user(token=token, db=db)

    db_result = TestResult(
        user_id=user.id if user else None,
        provider=result.provider,
        model=result.model,
        ttft_ms=result.ttft_ms,
        tps=result.tps,
        total_tokens=result.total_tokens,
        latency_ms=result.latency_ms,
        region=result.region,
        timestamp=result.timestamp or datetime.now(timezone.utc),
    )
    try:
        db.add(db_result)
        db.commit()
        db.refresh(db_result)
    except Exception as e:
        db.rollback()
        logger.exception("Result submission failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit result. Please try again.",
        )

    return TestResultResponse(
        id=db_result.id,
        provider=db_result.provider,
        model=db_result.model,
        ttft_ms=db_result.ttft_ms,
        tps=db_result.tps,
        total_tokens=db_result.total_tokens,
        latency_ms=db_result.latency_ms,
        region=db_result.region,
        timestamp=db_result.timestamp,
        username=user.username if user else None,
    )


@router.get("/global", response_model=GlobalStatsResponse)
def get_global_results(db: Session = Depends(get_db)):
    """Get aggregated global stats grouped by provider and model.

    Returns averages for TTFT, TPS, latency, token count, and total runs.
    """
    stats = get_global_stats(db)
    total = db.query(TestResult).count()
    return GlobalStatsResponse(stats=stats, total_results=total)


@router.get("/recent", response_model=list[TestResultResponse])
def get_recent_results(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get the most recent results (latest first), up to the given limit."""
    rows = (
        db.query(TestResult)
        .order_by(TestResult.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        TestResultResponse(
            id=r.id,
            provider=r.provider,
            model=r.model,
            ttft_ms=r.ttft_ms,
            tps=r.tps,
            total_tokens=r.total_tokens,
            latency_ms=r.latency_ms,
            region=r.region,
            timestamp=r.timestamp,
            username=r.user.username if r.user else None,
        )
        for r in rows
    ]