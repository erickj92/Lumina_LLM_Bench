"""Authentication endpoints — register and login.

- POST /auth/register — Create a new user account
- POST /auth/login   — Authenticate and receive a JWT token
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import hash_password, verify_password, create_access_token
from database import get_db
from models import User
from schemas import RegisterRequest, LoginRequest, TokenResponse

logger = logging.getLogger("lumina_bench.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user. Returns a JWT token on success."""
    # Validate input
    username = req.username.strip()
    password = req.password

    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters",
        )
    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters",
        )

    # Check for duplicate username
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    # Create the user
    try:
        user = User(
            username=username,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        logger.exception("User registration failed for '%s': %s", username, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again later.",
        )

    # Issue token
    token = create_access_token(username=username)
    return TokenResponse(access_token=token, username=username)


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with username + password. Returns a JWT token."""
    username = req.username.strip()
    password = req.password

    try:
        user = db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token(username=username)
        return TokenResponse(access_token=token, username=username)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Login failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again later.",
        )