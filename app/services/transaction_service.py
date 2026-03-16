import uuid

from sqlalchemy import select
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
        return list(result.scalars().all())

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

        # Capture original values that affect account balance
        original_account_id = txn.account_id
        original_amount = txn.amount
        original_type = txn.type

        update_data = body.model_dump(exclude_none=True)
        for field, value in update_data.items():
            setattr(txn, field, value)

        # If neither account_id, amount, nor type changed, no balance adjustment is needed
        if not {"account_id", "amount", "type"} & update_data.keys():
            await self.db.commit()
            await self.db.refresh(txn)
            return txn

        # Lock original account row
        result = await self.db.execute(
            select(Account)
            .where(Account.tenant_id == tenant_id, Account.id == original_account_id)
            .with_for_update()
        )
        original_account = result.scalar_one_or_none()
        if not original_account:
            raise ResourceNotFoundException("Account")

        # Determine current values after update
        new_account_id = txn.account_id
        new_amount = txn.amount
        new_type = txn.type

        # If account changed, lock the new account as well
        new_account = original_account
        if new_account_id != original_account_id:
            result = await self.db.execute(
                select(Account)
                    .where(Account.tenant_id == tenant_id, Account.id == new_account_id)
                    .with_for_update()
            )
            new_account = result.scalar_one_or_none()
            if not new_account:
                raise ResourceNotFoundException("Account")

        # Revert original transaction impact on original account
        if original_type == TransactionType.CREDIT:
            original_account.balance -= original_amount
        else:
            original_account.balance += original_amount

        # Apply new transaction impact on (possibly different) account
        target_account = new_account
        if new_type == TransactionType.CREDIT:
            target_account.balance += new_amount
        else:
            target_account.balance -= new_amount

        await self.db.commit()
        await self.db.refresh(txn)
        return txn

    async def delete_transaction(self, tenant_id: uuid.UUID, transaction_id: uuid.UUID) -> None:
        txn = await self.get_transaction(tenant_id, transaction_id)

        # Lock account row and revert balance atomically
        result = await self.db.execute(
            select(Account)
            .where(Account.tenant_id == tenant_id, Account.id == txn.account_id)
            .with_for_update()
        )
        account = result.scalar_one_or_none()
        if not account:
            raise ResourceNotFoundException("Account")

        if txn.type == TransactionType.CREDIT:
            account.balance -= txn.amount
        else:
            account.balance += txn.amount

        await self.db.delete(txn)
        await self.db.commit()
