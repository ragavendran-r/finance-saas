import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

from app.core.database import get_db
from app.main import create_app
from app.models.base import Base


def _to_asyncpg_url(url: str) -> str:
    # testcontainers returns sync SQLAlchemy-style URLs; convert to asyncpg.
    return url.replace("postgresql://", "postgresql+asyncpg://", 1)


@pytest.fixture(scope="session")
def postgres_url() -> str:
    """Provide a Postgres URL for tests.

    - If DATABASE_URL is set, use it (e.g., CI service container).
    - Otherwise, start an ephemeral Postgres via testcontainers.
    """
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        yield env_url
        return

    with PostgresContainer("postgres:16", username="postgres", password="password", dbname="finance_saas_test") as pg:
        yield _to_asyncpg_url(pg.get_connection_url())


@pytest_asyncio.fixture(scope="function")
async def db(postgres_url: str):
    engine = create_async_engine(postgres_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
