"""Pydantic schemas for request validation and response serialization."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ── Auth Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Results Schemas ────────────────────────────────────────────────────────

class TestResultSubmit(BaseModel):
    provider: str
    model: str
    ttft_ms: float
    tps: float
    total_tokens: int
    latency_ms: float
    region: Optional[str] = None
    timestamp: Optional[datetime] = None  # Default to server time if omitted


class TestResultResponse(BaseModel):
    id: int
    provider: str
    model: str
    ttft_ms: float
    tps: float
    total_tokens: int
    latency_ms: float
    region: Optional[str] = None
    timestamp: datetime
    username: Optional[str] = None  # Only present for authenticated users

    model_config = {"from_attributes": True}


class AggregatedStats(BaseModel):
    provider: str
    model: str
    avg_ttft_ms: float
    avg_tps: float
    avg_latency_ms: float
    avg_total_tokens: float
    total_runs: int
    last_updated: Optional[datetime] = None


class GlobalStatsResponse(BaseModel):
    stats: list[AggregatedStats]
    total_results: int