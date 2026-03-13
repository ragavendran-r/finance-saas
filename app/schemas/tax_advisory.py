from decimal import Decimal

from pydantic import BaseModel, field_validator


class TaxRecommendationRequest(BaseModel):
    annual_income: Decimal | None = None  # if None, derived from transactions
    age: int | None = None
    regime_preference: str = "new"

    @field_validator("regime_preference", mode="before")
    @classmethod
    def normalize_regime(cls, v: str) -> str:
        return v.lower() if isinstance(v, str) else v


class TaxRecommendationResponse(BaseModel):
    annual_income_used: Decimal
    llm_provider: str
    result: dict  # raw structured JSON from the LLM
