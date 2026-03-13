"""Tax advisory service — uses an LLM to generate personalised Indian tax saving recommendations."""
import json
import re
import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType
from app.services.llm.factory import get_llm_provider

# ---------------------------------------------------------------------------
# System prompt — baked-in Indian tax law context for FY 2025-26
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """
You are a certified Indian tax advisor with deep expertise in Indian Income Tax Act, 1961.
You provide accurate, actionable, and personalised tax-saving recommendations for Indian taxpayers
for Financial Year 2025-26 (Assessment Year 2026-27).

## Current Tax Regime Details

### New Tax Regime (Default from FY 2023-24)
Slabs:
- ₹0 – ₹3,00,000: Nil
- ₹3,00,001 – ₹7,00,000: 5%
- ₹7,00,001 – ₹10,00,000: 10%
- ₹10,00,001 – ₹12,00,000: 15%
- ₹12,00,001 – ₹15,00,000: 20%
- Above ₹15,00,000: 30%
Standard deduction: ₹75,000 (employees)
Rebate u/s 87A: Full tax rebate if net income ≤ ₹7,00,000 (tax becomes NIL)
Surcharge: 10% if income >₹50L, 15% if >₹1Cr, 25% if >₹2Cr
Health & Education Cess: 4% on tax + surcharge
Deductions NOT allowed under new regime (except 80CCD(2), 80JJAA, standard deduction)

### Old Tax Regime
Slabs:
- ₹0 – ₹2,50,000: Nil
- ₹2,50,001 – ₹5,00,000: 5%
- ₹5,00,001 – ₹10,00,000: 20%
- Above ₹10,00,000: 30%
Standard deduction: ₹50,000
Rebate u/s 87A: Full rebate if net taxable income ≤ ₹5,00,000
Surcharge and cess same as new regime
Major deductions available:
- Sec 80C: up to ₹1,50,000 (PPF, ELSS, LIC, NSC, SCSS, home loan principal, tuition fees)
- Sec 80CCD(1B): additional ₹50,000 for NPS (over and above 80C)
- Sec 80D: ₹25,000 (self/family) + ₹25,000 (parents) health insurance; ₹50,000 if parent is senior citizen
- Sec 24(b): up to ₹2,00,000 on home loan interest (self-occupied)
- Sec 80TTA: up to ₹10,000 interest on savings account
- Sec 80TTB (senior citizens): up to ₹50,000 on interest income
- HRA exemption: min of (actual HRA | 50%/40% of salary | HRA – 10% salary)
- LTA: exempt up to actual travel cost (2 journeys in 4-year block)
- Sec 10(13A): House Rent Allowance
- Sec 80G: donations to eligible institutions (50% or 100% deduction)
- Sec 80E: interest on education loan (no upper limit, 8 years)

## Response Format
Return ONLY a valid JSON object (no markdown fences, no preamble) with this exact structure:
{
  "regime_recommendation": "new" | "old",
  "regime_reasoning": "string",
  "estimated_tax": {
    "new_regime": number,
    "old_regime_before_planning": number,
    "old_regime_after_planning": number
  },
  "recommendations": [
    {
      "section": "e.g. 80C",
      "title": "short title",
      "instruments": ["PPF", "ELSS", ...],
      "max_deduction": number,
      "potential_tax_saving": number,
      "priority": "high" | "medium" | "low",
      "description": "2–3 sentence explanation"
    }
  ],
  "total_potential_saving": number,
  "summary": "3–4 sentence personalised summary",
  "disclaimer": "standard disclaimer string"
}
All monetary values must be plain numbers (no ₹ symbol, no commas).
""".strip()


def _calculate_tax_new_regime(income: float) -> float:
    """Quick estimate for new regime (pre-cess). Used for fallback only."""
    std_deduction = 75_000
    taxable = max(0.0, income - std_deduction)
    if taxable <= 7_00_000:
        return 0.0  # 87A rebate
    slabs = [(3_00_000, 0), (4_00_000, 0.05), (3_00_000, 0.10), (2_00_000, 0.15), (3_00_000, 0.20)]
    tax = 0.0
    remaining = taxable
    for limit, rate in slabs:
        chunk = min(remaining, limit)
        tax += chunk * rate
        remaining -= chunk
        if remaining <= 0:
            break
    if remaining > 0:
        tax += remaining * 0.30
    return tax * 1.04  # 4% cess


class TaxAdvisoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.llm = get_llm_provider()

    async def _annual_income_from_transactions(self, tenant_id: uuid.UUID) -> Decimal:
        """Sum of CREDIT transactions in the current financial year as a fallback."""
        from datetime import date
        today = date.today()
        fy_start = date(today.year if today.month >= 4 else today.year - 1, 4, 1)
        result = await self.db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.tenant_id == tenant_id,
                Transaction.type == TransactionType.CREDIT,
                Transaction.date >= fy_start,
            )
        )
        return result.scalar() or Decimal("0")

    async def get_recommendations(
        self,
        tenant_id: uuid.UUID,
        annual_income: Decimal | None,
        age: int | None,
        regime_preference: str,
    ) -> dict:
        if annual_income is None or annual_income <= 0:
            annual_income = await self._annual_income_from_transactions(tenant_id)

        age_context = f"The taxpayer is {age} years old." if age else ""
        user_prompt = (
            f"Annual income: ₹{annual_income:,.0f}. "
            f"Preferred regime: {regime_preference}. "
            f"{age_context} "
            "Please provide personalised tax-saving recommendations."
        )

        raw = await self.llm.complete(system=_SYSTEM_PROMPT, user=user_prompt)

        # Extract JSON — strip any accidental markdown fences
        json_str = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # Graceful degradation: return raw text wrapped in summary field
            return {
                "regime_recommendation": regime_preference,
                "regime_reasoning": "",
                "estimated_tax": {},
                "recommendations": [],
                "total_potential_saving": 0,
                "summary": raw,
                "disclaimer": "This is AI-generated guidance for informational purposes only. Consult a qualified CA before making tax decisions.",
            }
