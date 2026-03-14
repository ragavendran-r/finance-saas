import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundException
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate


class AccountService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_accounts(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> list[Account]:
        result = await self.db.execute(
            select(Account)
            .where(Account.tenant_id == tenant_id, Account.user_id == user_id, Account.is_active)
            .order_by(Account.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_account(self, tenant_id: uuid.UUID, user_id: uuid.UUID, body: AccountCreate) -> Account:
        account = Account(id=uuid.uuid4(), tenant_id=tenant_id, user_id=user_id, **body.model_dump())
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)  # needed to get DB-formatted Numeric balance
        return account

    async def get_account(self, tenant_id: uuid.UUID, account_id: uuid.UUID) -> Account:
        result = await self.db.execute(
            select(Account).where(Account.tenant_id == tenant_id, Account.id == account_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise ResourceNotFoundException("Account")
        return account

    async def update_account(self, tenant_id: uuid.UUID, account_id: uuid.UUID, body: AccountUpdate) -> Account:
        account = await self.get_account(tenant_id, account_id)
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(account, field, value)
        await self.db.commit()
        return account

    async def delete_account(self, tenant_id: uuid.UUID, account_id: uuid.UUID) -> None:
        account = await self.get_account(tenant_id, account_id)
        account.is_active = False
        await self.db.commit()
