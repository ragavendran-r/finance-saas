from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.spend_advisory import SpendRecommendationRequest, SpendRecommendationResponse
from app.services.spend_advisory_service import SpendAdvisoryService

router = APIRouter()


@router.post("/recommendations", response_model=SpendRecommendationResponse)
async def get_spend_recommendations(
    payload: SpendRecommendationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    date_to = date.fromisoformat(payload.date_to) if payload.date_to else today
    date_from = date.fromisoformat(payload.date_from) if payload.date_from else (today - timedelta(days=90))

    service = SpendAdvisoryService(db)
    result = await service.get_recommendations(
        tenant_id=current_user.tenant_id,
        date_from=date_from,
        date_to=date_to,
    )

    return SpendRecommendationResponse(
        llm_provider=get_settings().LLM_PROVIDER,
        date_from=date_from.isoformat(),
        date_to=date_to.isoformat(),
        result=result,
    )
