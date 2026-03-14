import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.budget import BudgetPeriod


class BudgetCreate(BaseModel):
    category_id: uuid.UUID
    amount: Decimal
    period: BudgetPeriod

    @field_validator("period", mode="before")
    @classmethod
    def normalize_period(cls, v: str) -> str:
        return v.lower() if isinstance(v, str) else v
    start_date: date
    end_date: date | None = None


class BudgetUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    amount: Decimal | None = None
    period: BudgetPeriod | None = None
    start_date: date | None = None
    end_date: date | None = None

    @field_validator("period", mode="before")
    @classmethod
    def normalize_period(cls, v: str) -> str:
        return v.lower() if isinstance(v, str) else v


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    amount: Decimal
    period: BudgetPeriod
    start_date: date
    end_date: date | None
    created_at: datetime


class BudgetProgress(BaseModel):
    budget: BudgetResponse
    budgeted: Decimal
    spent: Decimal
    remaining: Decimal
    percent_used: float
