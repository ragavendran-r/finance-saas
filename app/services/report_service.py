import uuid
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.budget import Budget, BudgetPeriod
from app.models.category import Category
from app.models.transaction import Transaction, TransactionType
from app.schemas.budget import BudgetProgress


def _period_window(budget: Budget, today: date) -> tuple[date, date]:
    """Return (period_start, period_end) for today clamped to budget bounds."""
    if budget.period == BudgetPeriod.MONTHLY:
        period_start = today.replace(day=1)
        last_day = monthrange(today.year, today.month)[1]
        period_end = today.replace(day=last_day)
    elif budget.period == BudgetPeriod.WEEKLY:
        period_start = today - timedelta(days=today.weekday())
        period_end = period_start + timedelta(days=6)
    else:  # YEARLY
        period_start = today.replace(month=1, day=1)
        period_end = today.replace(month=12, day=31)

    period_start = max(period_start, budget.start_date)
    if budget.end_date:
        period_end = min(period_end, budget.end_date)

    return period_start, period_end


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
            .where(Account.tenant_id == tenant_id, Account.is_active)
            .group_by(Account.type)
        )
        by_type = {row.type.value: row.total for row in result}
        total = sum(by_type.values(), Decimal("0"))
        return {"by_account_type": by_type, "total": total}

    async def budget_vs_actual(self, tenant_id: uuid.UUID, date_from: date, date_to: date) -> list[BudgetProgress]:
        from app.schemas.budget import BudgetProgress, BudgetResponse

        # Fetch all budgets in one query
        budgets_result = await self.db.execute(
            select(Budget).where(Budget.tenant_id == tenant_id)
        )
        budgets = budgets_result.scalars().all()
        if not budgets:
            return []

        # Compute the current period window per budget and collect all category_ids
        today = date.today()
        budget_windows: list[tuple[Budget, date, date]] = []
        for b in budgets:
            budget_windows.append((b, *_period_window(b, today)))

        # Single aggregation query: sum spend per (category_id, period_start, period_end).
        # Because different budgets may have different period windows we group by category_id
        # and filter with a broad date range, then match per-budget in Python.
        min_start = min(w[1] for w in budget_windows)
        max_end = max(w[2] for w in budget_windows)

        spend_result = await self.db.execute(
            select(
                Transaction.category_id,
                Transaction.date,
                func.sum(Transaction.amount).label("total"),
            )
            .where(
                Transaction.tenant_id == tenant_id,
                Transaction.type == TransactionType.DEBIT,
                Transaction.date >= min_start,
                Transaction.date <= max_end,
            )
            .group_by(Transaction.category_id, Transaction.date)
        )
        # Build a lookup: category_id -> list of (date, amount)
        from collections import defaultdict
        spend_by_cat: dict[uuid.UUID | None, list[tuple[date, Decimal]]] = defaultdict(list)
        for row in spend_result:
            spend_by_cat[row.category_id].append((row.date, row.total))

        rows = []
        for budget, period_start, period_end in budget_windows:
            spent = sum(
                amt
                for txn_date, amt in spend_by_cat.get(budget.category_id, [])
                if period_start <= txn_date <= period_end
            )
            spent = Decimal(str(spent))
            remaining = budget.amount - spent
            percent_used = float(spent / budget.amount * 100) if budget.amount else 0.0
            rows.append(BudgetProgress(
                budget=BudgetResponse.model_validate(budget),
                budgeted=budget.amount,
                spent=spent,
                remaining=remaining,
                percent_used=percent_used,
            ))
        return rows
