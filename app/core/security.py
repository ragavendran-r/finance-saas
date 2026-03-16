from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError, PyJWTError
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: UUID, tenant_id: UUID, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "tenant_id": str(tenant_id), "role": role, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_refresh_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "jti": str(uuid4()), "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_token(token: str) -> dict:
    """Decode JWT, returning payload or empty dict on any error.

    This preserves the original behavior relied on by tests and callers.
    """
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except PyJWTError:
        return {}


def decode_token_with_error(token: str) -> tuple[dict, str | None]:
    """Decode JWT and classify error type without raising.

    Returns (payload, error_code) where error_code is one of:
    - "expired"
    - "invalid"
    - "token_error"
    - None (no error)
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload, None
    except ExpiredSignatureError:
        return {}, "expired"
    except InvalidTokenError:
        return {}, "invalid"
    except PyJWTError:
        return {}, "token_error"
