"""Database connection and session management for Lumina Bench.

Uses SQLite with SQLAlchemy async-style session handling (sync for simplicity).
A single local SQLite file stores users and anonymized test results.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Single-file SQLite database stored next to the backend
DATABASE_URL = "sqlite:///./lumina_bench.db"

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