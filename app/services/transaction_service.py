import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ResourceNotFoundException
from app.models.account import Account
from app.models.transaction import Transaction, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionFilters, TransactionUpdate

_EAGER = [selectinload(Transaction.account), selectinload(Transaction.category)]


class TransactionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_transactions(self, tenant_id: uuid.UUID, filters: TransactionFilters) -> list[Transaction]:
        stmt = select(Transaction).options(*_EAGER).where(Transaction.tenant_id == tenant_id)
        if filters.account_id:
            stmt = stmt.where(Transaction.account_id == filters.account_id)
        if filters.category_id:
            stmt = stmt.where(Transaction.category_id == filters.category_id)
        if filters.type:
            stmt = stmt.where(Transaction.type == filters.type)
        if filters.date_from:
            stmt = stmt.where(Transaction.date >= filters.date_from)
        if filters.date_to:
            stmt = stmt.where(Transaction.date <= filters.date_to)
        if filters.search:
            stmt = stmt.where(Transaction.description.ilike(f"%{filters.search}%"))
        stmt = stmt.order_by(Transaction.date.desc()).limit(filters.limit).offset(filters.offset)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_transaction(self, tenant_id: uuid.UUID, body: TransactionCreate) -> Transaction:
        # Lock account row and update balance atomically
        result = await self.db.execute(
            select(Account)
            .where(Account.tenant_id == tenant_id, Account.id == body.account_id)
            .with_for_update()
        )
        account = result.scalar_one_or_none()
        if not account:
            raise ResourceNotFoundException("Account")

        txn = Transaction(id=uuid.uuid4(), tenant_id=tenant_id, **body.model_dump())
        self.db.add(txn)

        if body.type == TransactionType.CREDIT:
            account.balance += body.amount
        else:
            account.balance -= body.amount

        await self.db.commit()
        await self.db.refresh(txn)
        return txn

    async def get_transaction(self, tenant_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
        result = await self.db.execute(
            select(Transaction).options(*_EAGER).where(
                Transaction.tenant_id == tenant_id, Transaction.id == transaction_id
            )
        )
        txn = result.scalar_one_or_none()
        if not txn:
            raise ResourceNotFoundException("Transaction")
        return txn

    async def update_transaction(
        self, tenant_id: uuid.UUID, transaction_id: uuid.UUID, body: TransactionUpdate
    ) -> Transaction:
        txn = await self.get_transaction(tenant_id, transaction_id)
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(txn, field, value)
        await self.db.commit()
        await self.db.refresh(txn)
        return txn

    async def delete_transaction(self, tenant_id: uuid.UUID, transaction_id: uuid.UUID) -> None:
        txn = await self.get_transaction(tenant_id, transaction_id)
        await self.db.delete(txn)
        await self.db.commit()
