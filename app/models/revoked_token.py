import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RevokedToken(Base):
    """Stores revoked refresh token JTIs for server-side logout and rotation."""

    __tablename__ = "revoked_tokens"

    jti: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(server_default=func.now())
    # Mirrors the refresh token expiry so we can clean up old rows
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
