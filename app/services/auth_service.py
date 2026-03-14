import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateResourceException, NotAuthorizedException
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
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

    async def refresh(self, refresh_token: str) -> str:
        from app.core.security import decode_token
        payload = decode_token(refresh_token)
        if not payload or "sub" not in payload:
            raise NotAuthorizedException()
        user_id = uuid.UUID(payload["sub"])
        result = await self.db.execute(select(User).where(User.id == user_id, User.is_active == True))
        user = result.scalar_one_or_none()
        if not user:
            raise NotAuthorizedException()
        return create_access_token(user.id, user.tenant_id, user.role.value)
