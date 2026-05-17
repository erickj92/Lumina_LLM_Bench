"""Database connection and session management for Lumina Bench.

Uses SQLite with SQLAlchemy async-style session handling (sync for simplicity).
A single local SQLite file stores users and anonymized test results.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Single-file SQLite database — path configurable via env var
# In Docker, mount /data volume and set DATABASE_URL=sqlite:///data/lumina_bench.db
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./lumina_bench.db",
)

# Ensure the parent directory for the database exists
_db_path = DATABASE_URL.removeprefix("sqlite:///")
_db_dir = os.path.dirname(_db_path)
if _db_dir:
    os.makedirs(_db_dir, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Allow multi-threaded access
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()