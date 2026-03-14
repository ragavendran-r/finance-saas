from typing import Any

from pydantic import BaseModel


class SpendRecommendationRequest(BaseModel):
    date_from: str | None = None  # ISO date, defaults to 3 months ago
    date_to: str | None = None    # ISO date, defaults to today


class SpendRecommendationResponse(BaseModel):
    llm_provider: str
    date_from: str
    date_to: str
    result: dict[str, Any]
