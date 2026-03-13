import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction, TransactionType


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def spending_by_category(self, tenant_id: uuid.UUID, date_from: date, date_to: date) -> list[dict]:
        result = await self.db.execute(
            select(Category.id, Category.name, func.sum(Transaction.amount).label("total"))
            .outerjoin(Category, Transaction.category_id == Category.id)
            .where(
                Transaction.tenant_id == tenant_id,
                Transaction.type == TransactionType.DEBIT,
                Transaction.date >= date_from,
                Transaction.date <= date_to,
            )
            .group_by(Category.id, Category.name)
            .order_by(func.sum(Transaction.amount).desc())
        )
        return [
            {
                "category": {"id": str(row.id), "name": row.name} if row.id else None,
                "total": row.total,
            }
            for row in result
        ]

    async def income_vs_expenses(self, tenant_id: uuid.UUID, date_from: date, date_to: date) -> dict:
        async def total_by_type(txn_type: TransactionType) -> Decimal:
            result = await self.db.execute(
                select(func.sum(Transaction.amount)).where(
                    Transaction.tenant_id == tenant_id,
                    Transaction.type == txn_type,
                    Transaction.date >= date_from,
                    Transaction.date <= date_to,
                )
            )
            return result.scalar() or Decimal("0")

        income = await total_by_type(TransactionType.CREDIT)
        expenses = await total_by_type(TransactionType.DEBIT)
        return {"income": income, "expenses": expenses, "net": income - expenses}

    async def net_worth(self, tenant_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(Account.type, func.sum(Account.balance).label("total"))
            .where(Account.tenant_id == tenant_id, Account.is_active == True)
            .group_by(Account.type)
        )
        by_type = {row.type.value: row.total for row in result}
        total = sum(by_type.values(), Decimal("0"))
        return {"by_account_type": by_type, "total": total}

    async def budget_vs_actual(self, tenant_id: uuid.UUID, date_from: date, date_to: date) -> list[dict]:
        from app.models.budget import Budget
        from app.services.budget_service import BudgetService

        budgets_result = await self.db.execute(
            select(Budget).where(Budget.tenant_id == tenant_id)
        )
        budgets = budgets_result.scalars().all()

        service = BudgetService(self.db)
        rows = []
        for b in budgets:
            progress = await service.get_progress(tenant_id, b.id)
            rows.append(progress)
        return rows
