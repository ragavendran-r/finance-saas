"""Spend advisory service — uses an LLM to generate personalised spending recommendations."""
import asyncio
import json
import re
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction, TransactionType
from app.services.llm.factory import get_llm_provider

_SYSTEM_PROMPT = """
You are a personal finance advisor specialising in household budgeting and spending optimisation.
Given a user's income, categorised expenses, and budget targets for a recent period, you provide
clear, actionable, and personalised recommendations to help them spend smarter, save more, and
reach their financial goals.

You must also review each budget allocation and advise whether it is too low, too high, or
appropriate relative to actual spending and income. For categories with no budget set but
significant spending, recommend a budget amount.

## Response Format
Return ONLY a valid JSON object (no markdown fences, no preamble) with this exact structure:
{
  "monthly_summary": {
    "avg_income": number,
    "avg_expenses": number,
    "avg_savings": number,
    "savings_rate_pct": number
  },
  "annual_projection": {
    "projected_income": number,
    "projected_expenses": number,
    "projected_savings": number
  },
  "over_budget_categories": [
    {
      "category": "string",
      "budgeted": number,
      "spent": number,
      "overspend": number
    }
  ],
  "budget_advice": [
    {
      "category": "string",
      "current_budget": number | null,
      "avg_monthly_spend": number,
      "suggested_budget": number,
      "verdict": "increase | decrease | on_track | set_budget",
      "reason": "1–2 sentence explanation"
    }
  ],
  "recommendations": [
    {
      "title": "short title",
      "category": "category name or null",
      "type": "reduce | reallocate | save | invest",
      "priority": "high | medium | low",
      "monthly_impact": number,
      "description": "2–3 sentence personalised explanation"
    }
  ],
  "summary": "3–4 sentence overall summary with key insights",
  "disclaimer": "standard disclaimer"
}
All monetary values must be plain numbers (no ₹ symbol, no commas).
""".strip()


class SpendAdvisoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.llm = get_llm_provider()

    async def get_recommendations(
        self,
        tenant_id: uuid.UUID,
        date_from: date,
        date_to: date,
    ) -> dict:
        # --- Gather income, expenses, and budgets in parallel ---
        income_q = select(func.sum(Transaction.amount)).where(
            Transaction.tenant_id == tenant_id,
            Transaction.type == TransactionType.CREDIT,
            Transaction.date >= date_from,
            Transaction.date <= date_to,
        )
        expense_q = (
            select(Category.name, func.sum(Transaction.amount).label("total"))
            .outerjoin(Category, Transaction.category_id == Category.id)
            .where(
                Transaction.tenant_id == tenant_id,
                Transaction.type == TransactionType.DEBIT,
                Transaction.date >= date_from,
                Transaction.date <= date_to,
            )
            .group_by(Category.name)
            .order_by(func.sum(Transaction.amount).desc())
        )
        budget_q = (
            select(Budget, Category.name.label("cat_name"))
            .outerjoin(Category, Budget.category_id == Category.id)
            .where(Budget.tenant_id == tenant_id)
        )

        income_result, expense_result, budget_result = await asyncio.gather(
            self.db.execute(income_q),
            self.db.execute(expense_q),
            self.db.execute(budget_q),
        )

        total_income = income_result.scalar() or Decimal("0")
        category_expenses = [
            {"category": row.name or "Uncategorized", "spent": float(row.total)}
            for row in expense_result
        ]
        total_expenses: float = sum(r["spent"] for r in category_expenses)  # type: ignore[misc]
        budgets = [
            {"category": row.cat_name or "Unknown", "amount": float(row.Budget.amount), "period": row.Budget.period.value}
            for row in budget_result
        ]
        budget_by_cat = {b["category"]: b["amount"] for b in budgets}

        # --- Build number of months in range ---
        days = (date_to - date_from).days + 1
        months = max(1, round(days / 30))

        avg_monthly_income = float(total_income) / months
        avg_monthly_expenses = total_expenses / months

        # --- Compose per-category budget vs actual table ---
        all_cats = {r["category"] for r in category_expenses} | set(budget_by_cat.keys())
        expense_by_cat: dict[str, float] = {r["category"]: r["spent"] / months for r in category_expenses}  # type: ignore[misc,operator]

        bva_lines = []
        for cat in sorted(all_cats):
            avg_spend = expense_by_cat.get(cat, 0.0)  # type: ignore[arg-type]
            budget_amt = budget_by_cat.get(cat)  # type: ignore[arg-type]
            if budget_amt is not None:
                diff = avg_spend - budget_amt
                status = f"OVER by ₹{diff:,.0f}" if diff > 0 else f"under by ₹{abs(diff):,.0f}"
                bva_lines.append(f"  - {cat}: budget ₹{budget_amt:,.0f}/month, actual ₹{avg_spend:,.0f}/month ({status})")
            else:
                bva_lines.append(f"  - {cat}: NO BUDGET SET, actual ₹{avg_spend:,.0f}/month")

        expense_lines = "\n".join(bva_lines) or "  (none)"

        user_prompt = (
            f"Analysis period: {date_from} to {date_to} ({months} month{'s' if months != 1 else ''}).\n\n"
            f"Total income in period: ₹{float(total_income):,.0f} "
            f"(avg ₹{avg_monthly_income:,.0f}/month)\n\n"
            f"Total expenses in period: ₹{total_expenses:,.0f} "
            f"(avg ₹{avg_monthly_expenses:,.0f}/month)\n\n"
            f"Category breakdown (budget vs actual per month):\n{expense_lines}\n\n"
            "Tasks:\n"
            "1. Identify over-budget categories and explain why they need attention.\n"
            "2. For EVERY category, populate budget_advice: verdict must be one of "
            "   'increase' (budget too low vs spend), 'decrease' (budget far above spend), "
            "   'on_track' (within 10%), or 'set_budget' (no budget currently set).\n"
            "3. Suggest concrete spending recommendations (reduce, reallocate, save, invest).\n"
            "4. Base all monthly figures on actual averages computed above."
        )

        raw = await self.llm.complete(system=_SYSTEM_PROMPT, user=user_prompt)

        cleaned = re.sub(r"```(?:json)?\n?", "", raw).strip().strip("\ufeff")
        # Try direct parse first (works for Gemini which returns clean JSON)
        try:
            return json.loads(cleaned)
        except (json.JSONDecodeError, ValueError):
            pass
        # Fall back to extracting between first { and last }
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        json_str = cleaned[start: end + 1] if start != -1 and end > start else cleaned
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            return {
                "monthly_summary": {
                    "avg_income": avg_monthly_income,
                    "avg_expenses": avg_monthly_expenses,
                    "avg_savings": avg_monthly_income - avg_monthly_expenses,
                    "savings_rate_pct": round(
                        (avg_monthly_income - avg_monthly_expenses) / avg_monthly_income * 100
                        if avg_monthly_income > 0 else 0,
                        1,
                    ),
                },
                "annual_projection": {
                    "projected_income": avg_monthly_income * 12,
                    "projected_expenses": avg_monthly_expenses * 12,
                    "projected_savings": (avg_monthly_income - avg_monthly_expenses) * 12,
                },
                "over_budget_categories": [],
                "recommendations": [],
                "summary": raw,
                "disclaimer": "This is AI-generated guidance for informational purposes only.",
            }
