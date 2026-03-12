from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter()


@router.get("/spending-by-category")
async def spending_by_category(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).spending_by_category(current_user.tenant_id, date_from, date_to)


@router.get("/income-vs-expenses")
async def income_vs_expenses(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).income_vs_expenses(current_user.tenant_id, date_from, date_to)


@router.get("/net-worth")
async def net_worth(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).net_worth(current_user.tenant_id)


@router.get("/budget-vs-actual")
async def budget_vs_actual(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).budget_vs_actual(current_user.tenant_id, date_from, date_to)
