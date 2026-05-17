"""JWT token creation, verification, and dependency injection.

Uses python-jose for JWT with HMAC-SHA256 signing.
Tokens hold a username + expiry and are validated on protected endpoints.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User

# ── Configuration ─────────────────────────────────────────────────────────

# Use a fixed secret for simplicity. In production, read from env var.
SECRET_KEY = "lumina-bench-secret-key-change-in-production-v1"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72  # 3 days

# ── Password Hashing ──────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    """Return a bcrypt hash of the given password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plaintext password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT Creation ───────────────────────────────────────────────────────────

def create_access_token(username: str) -> str:
    """Create a JWT access token for the given username."""
    expires_delta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": username, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ── Token Verification ─────────────────────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that extracts and validates the JWT, returning the User.

    Raises 401 if the token is invalid, expired, or the user no longer exists.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception

    return user


def get_optional_user(
    token: Optional[str] = None,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Like get_current_user but doesn't raise on missing/invalid tokens.

    Used for endpoints that accept both authenticated and anonymous submissions.
    Returns None when no valid token is provided.
    """
    if token is None:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            return None
        user = db.query(User).filter(User.username == username).first()
        return user
    except JWTError:
        return None