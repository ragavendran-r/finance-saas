import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("", response_model=list[UserResponse], dependencies=[Depends(require_role("admin", "superadmin"))])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.user import User as UserModel

    result = await db.execute(
        select(UserModel).where(UserModel.tenant_id == current_user.tenant_id)
    )
    return result.scalars().all()
