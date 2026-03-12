import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.budget import BudgetPeriod


class BudgetCreate(BaseModel):
    category_id: uuid.UUID
    amount: Decimal
    period: BudgetPeriod
    start_date: date
    end_date: date | None = None


class BudgetUpdate(BaseModel):
    amount: Decimal | None = None
    end_date: date | None = None


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
