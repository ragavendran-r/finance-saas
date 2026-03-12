import enum
import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin


class ReportType(str, enum.Enum):
    SPENDING = "spending"
    INCOME = "income"
    NET_WORTH = "net_worth"
    BUDGET_VS_ACTUAL = "budget_vs_actual"


class SavedReport(Base, TenantMixin, TimestampMixin):
    __tablename__ = "saved_reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[ReportType]
    filters: Mapped[dict] = mapped_column(JSONB, default=dict)
