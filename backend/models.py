"""SQLAlchemy models for Lumina Bench.

Two tables:
- users: registered user accounts
- test_results: anonymized benchmark results (linked to user if authenticated)
"""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship to test results
    results = relationship("TestResult", back_populates="user", lazy="selectin")


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    provider = Column(String(100), nullable=False)
    model = Column(String(200), nullable=False)
    ttft_ms = Column(Float, nullable=False)       # Time to First Token (ms)
    tps = Column(Float, nullable=False)            # Tokens per Second
    total_tokens = Column(Integer, nullable=False) # Total tokens (estimated or actual)
    latency_ms = Column(Float, nullable=False)     # Connection latency (ms)
    region = Column(String(50), nullable=True)     # Optional region tag (e.g., "us-east")
    timestamp = Column(DateTime, nullable=False)    # When the test was run (client-side)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship back to user (nullable for anonymous submissions)
    user = relationship("User", back_populates="results")