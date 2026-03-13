import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.transaction import TransactionType


class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID | None = None
    amount: Decimal
    type: TransactionType

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, v: str) -> str:
        return v.lower() if isinstance(v, str) else v
    description: str
    merchant: str | None = None
    date: date
    is_recurring: bool = False
    notes: str | None = None


class TransactionUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    description: str | None = None
    merchant: str | None = None
    notes: str | None = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID | None
    amount: Decimal
    type: TransactionType
    description: str
    merchant: str | None
    date: date
    is_recurring: bool
    notes: str | None
    created_at: datetime


class TransactionFilters(BaseModel):
    account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    date_from: date | None = None
    date_to: date | None = None
    type: TransactionType | None = None
    search: str | None = None
    limit: int = 50
    offset: int = 0
