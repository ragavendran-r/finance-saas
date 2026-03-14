import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotAuthorizedException, ResourceNotFoundException
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_categories(self, tenant_id: uuid.UUID) -> list[Category]:
        result = await self.db.execute(
            select(Category).where(
                or_(Category.tenant_id == tenant_id, Category.is_system == True)
            )
        )
        return result.scalars().all()

    async def create_category(self, tenant_id: uuid.UUID, body: CategoryCreate) -> Category:
        cat = Category(id=uuid.uuid4(), tenant_id=tenant_id, **body.model_dump())
        self.db.add(cat)
        await self.db.commit()
        return cat

    async def update_category(self, tenant_id: uuid.UUID, category_id: uuid.UUID, body: CategoryUpdate) -> Category:
        result = await self.db.execute(
            select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
        )
        cat = result.scalar_one_or_none()
        if not cat:
            raise ResourceNotFoundException("Category")
        if cat.is_system:
            raise NotAuthorizedException()
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(cat, field, value)
        await self.db.commit()
        return cat

    async def delete_category(self, tenant_id: uuid.UUID, category_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
        )
        cat = result.scalar_one_or_none()
        if not cat:
            raise ResourceNotFoundException("Category")
        if cat.is_system:
            raise NotAuthorizedException()
        await self.db.delete(cat)
        await self.db.commit()
