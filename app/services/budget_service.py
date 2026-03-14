import uuid
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundException
from app.models.budget import Budget, BudgetPeriod
from app.models.transaction import Transaction, TransactionType
from app.schemas.budget import BudgetCreate, BudgetProgress, BudgetResponse, BudgetUpdate


def _current_period_window(budget: Budget) -> tuple[date, date]:
    """Return (period_start, period_end) for today clamped to budget bounds."""
    today = date.today()

    if budget.period == BudgetPeriod.MONTHLY:
        period_start = today.replace(day=1)
        last_day = monthrange(today.year, today.month)[1]
        period_end = today.replace(day=last_day)
    elif budget.period == BudgetPeriod.WEEKLY:
        period_start = today - timedelta(days=today.weekday())  # Monday
        period_end = period_start + timedelta(days=6)           # Sunday
    else:  # YEARLY
        period_start = today.replace(month=1, day=1)
        period_end = today.replace(month=12, day=31)

    # Clamp to budget bounds
    period_start = max(period_start, budget.start_date)
    if budget.end_date:
        period_end = min(period_end, budget.end_date)

    return period_start, period_end


class BudgetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_budgets(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> list[Budget]:
        result = await self.db.execute(
            select(Budget).where(Budget.tenant_id == tenant_id, Budget.user_id == user_id)
        )
        return result.scalars().all()

    async def create_budget(self, tenant_id: uuid.UUID, user_id: uuid.UUID, body: BudgetCreate) -> Budget:
        budget = Budget(id=uuid.uuid4(), tenant_id=tenant_id, user_id=user_id, **body.model_dump())
        self.db.add(budget)
        await self.db.commit()
        return budget

    async def get_budget(self, tenant_id: uuid.UUID, budget_id: uuid.UUID) -> Budget:
        result = await self.db.execute(
            select(Budget).where(Budget.tenant_id == tenant_id, Budget.id == budget_id)
        )
        budget = result.scalar_one_or_none()
        if not budget:
            raise ResourceNotFoundException("Budget")
        return budget

    async def update_budget(self, tenant_id: uuid.UUID, budget_id: uuid.UUID, body: BudgetUpdate) -> Budget:
        budget = await self.get_budget(tenant_id, budget_id)
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(budget, field, value)
        await self.db.commit()
        return budget

    async def delete_budget(self, tenant_id: uuid.UUID, budget_id: uuid.UUID) -> None:
        budget = await self.get_budget(tenant_id, budget_id)
        await self.db.delete(budget)
        await self.db.commit()

    async def get_progress(self, tenant_id: uuid.UUID, budget_id: uuid.UUID) -> BudgetProgress:
        budget = await self.get_budget(tenant_id, budget_id)

        period_start, period_end = _current_period_window(budget)
        stmt = select(func.sum(Transaction.amount)).where(
            Transaction.tenant_id == tenant_id,
            Transaction.category_id == budget.category_id,
            Transaction.type == TransactionType.DEBIT,
            Transaction.date >= period_start,
            Transaction.date <= period_end,
        )

        result = await self.db.execute(stmt)
        spent = result.scalar() or Decimal("0")
        remaining = budget.amount - spent
        percent_used = float(spent / budget.amount * 100) if budget.amount else 0.0

        return BudgetProgress(
            budget=BudgetResponse.model_validate(budget),
            budgeted=budget.amount,
            spent=spent,
            remaining=remaining,
            percent_used=percent_used,
        )
