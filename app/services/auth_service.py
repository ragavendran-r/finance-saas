import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateResourceException, NotAuthorizedException
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.models.revoked_token import RevokedToken
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, body: RegisterRequest) -> User:
        existing = await self.db.execute(select(Tenant).where(Tenant.slug == body.tenant_slug))
        if existing.scalar_one_or_none():
            raise DuplicateResourceException("Tenant slug already taken")

        tenant = Tenant(id=uuid.uuid4(), name=body.tenant_name, slug=body.tenant_slug)
        self.db.add(tenant)
        await self.db.flush()

        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            email=body.email,
            hashed_password=hash_password(body.password),
            full_name=body.full_name,
            role=UserRole.ADMIN,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def login(self, body: LoginRequest) -> dict:
        result = await self.db.execute(select(User).where(User.email == body.email, User.is_active == True))
        user = result.scalar_one_or_none()
        if not user or not verify_password(body.password, user.hashed_password):
            raise NotAuthorizedException()

        return {
            "access_token": create_access_token(user.id, user.tenant_id, user.role.value),
            "refresh_token": create_refresh_token(user.id),
        }

    async def refresh(self, refresh_token: str) -> dict:
        """Validate the refresh token, revoke it, and issue a rotated pair."""
        payload = decode_token(refresh_token)
        if not payload or "sub" not in payload or "jti" not in payload:
            raise NotAuthorizedException()

        jti = uuid.UUID(payload["jti"])
        user_id = uuid.UUID(payload["sub"])

        # Reject if this JTI has already been revoked (replay attack)
        existing = await self.db.execute(select(RevokedToken).where(RevokedToken.jti == jti))
        if existing.scalar_one_or_none():
            raise NotAuthorizedException()

        result = await self.db.execute(select(User).where(User.id == user_id, User.is_active == True))
        user = result.scalar_one_or_none()
        if not user:
            raise NotAuthorizedException()

        # Revoke the used token
        exp_ts = payload.get("exp")
        expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else datetime.now(timezone.utc)
        self.db.add(RevokedToken(jti=jti, user_id=user_id, expires_at=expires_at))
        await self.db.flush()

        return {
            "access_token": create_access_token(user.id, user.tenant_id, user.role.value),
            "refresh_token": create_refresh_token(user.id),
        }

    async def revoke_token(self, refresh_token: str) -> None:
        """Revoke a refresh token on logout."""
        payload = decode_token(refresh_token)
        if not payload or "jti" not in payload or "sub" not in payload:
            return  # Token already invalid — nothing to do

        jti = uuid.UUID(payload["jti"])
        user_id = uuid.UUID(payload["sub"])

        existing = await self.db.execute(select(RevokedToken).where(RevokedToken.jti == jti))
        if existing.scalar_one_or_none():
            return  # Already revoked

        exp_ts = payload.get("exp")
        expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else datetime.now(timezone.utc)
        self.db.add(RevokedToken(jti=jti, user_id=user_id, expires_at=expires_at))
        await self.db.commit()
