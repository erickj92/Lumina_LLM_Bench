"""Global stats aggregation queries for the leaderboard.

Provides the aggregated stats endpoint that powers the community dashboard.
All queries are anonymized — no API keys or prompts are stored.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import TestResult
from schemas import AggregatedStats


def get_global_stats(
    db: Session,
    min_runs: int = 1,
) -> list[AggregatedStats]:
    """Aggregate test results grouped by (provider, model).

    Returns averaged metrics for each combo that has at least `min_runs` results.
    """
    rows = (
        db.query(
            TestResult.provider,
            TestResult.model,
            func.avg(TestResult.ttft_ms).label("avg_ttft_ms"),
            func.avg(TestResult.tps).label("avg_tps"),
            func.avg(TestResult.latency_ms).label("avg_latency_ms"),
            func.avg(TestResult.total_tokens).label("avg_total_tokens"),
            func.count(TestResult.id).label("total_runs"),
            func.max(TestResult.created_at).label("last_updated"),
        )
        .group_by(TestResult.provider, TestResult.model)
        .having(func.count(TestResult.id) >= min_runs)
        .order_by(func.avg(TestResult.tps).desc())  # Best TPS first
        .all()
    )

    return [
        AggregatedStats(
            provider=row.provider,
            model=row.model,
            avg_ttft_ms=round(float(row.avg_ttft_ms), 1),
            avg_tps=round(float(row.avg_tps), 2),
            avg_latency_ms=round(float(row.avg_latency_ms), 1),
            avg_total_tokens=round(float(row.avg_total_tokens), 1),
            total_runs=int(row.total_runs),
            last_updated=row.last_updated,
        )
        for row in rows
    ]