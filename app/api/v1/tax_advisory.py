from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.tax_advisory import IncomeProjectionResponse, TaxRecommendationRequest, TaxRecommendationResponse
from app.services.tax_advisory_service import TaxAdvisoryService

router = APIRouter()


@router.get("/income-projection", response_model=IncomeProjectionResponse)
async def get_income_projection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaxAdvisoryService(db)
    data = await service.income_projection(current_user.tenant_id)
    return IncomeProjectionResponse(**data)


@router.post("/recommendations", response_model=TaxRecommendationResponse)
async def get_tax_recommendations(
    payload: TaxRecommendationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TaxAdvisoryService(db)
    income = payload.annual_income
    result = await service.get_recommendations(
        tenant_id=current_user.tenant_id,
        annual_income=income,
        age=payload.age,
        regime_preference=payload.regime_preference,
    )

    # Determine the actual income used (may have been derived from transactions)
    income_used = income
    if income_used is None or income_used <= 0:
        income_used = await service._annual_income_from_transactions(current_user.tenant_id)

    return TaxRecommendationResponse(
        annual_income_used=income_used,
        llm_provider=get_settings().LLM_PROVIDER,
        result=result,
    )
