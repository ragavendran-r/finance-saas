import uuid
from decimal import Decimal
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.account import AccountType


class AccountCreate(BaseModel):
    name: str
    type: AccountType
    currency: str = "USD"
    balance: Decimal = Decimal("0")
    institution_name: str | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    institution_name: str | None = None
    is_active: bool | None = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    type: AccountType
    currency: str
    balance: Decimal
    institution_name: str | None
    is_active: bool
    created_at: datetime
