"""Shared pytest fixtures for backend test suite."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.models import Base

# ── Test database (isolated from production) ──────────────────────
# Tests run against a dedicated schema so `drop_all` / `create_all`
# never touch the production tables.  Alembic migrations are applied
# instead of `create_all` so the schema matches what the app actually uses.
TEST_DATABASE_URL = "postgresql+asyncpg://liudetao:root@localhost/postgres_test"


@pytest.fixture(scope="session")
def settings():
    """Return settings with a deterministic secret for tests."""
    get_settings.cache_clear()
    return get_settings()


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """Ensure the test database exists, then return a session-scoped engine."""
    import asyncpg

    # Connect to the default `postgres` db to create `postgres_test` if missing
    conn = await asyncpg.connect(
        "postgresql://liudetao:root@localhost/postgres"
    )
    exists = await conn.fetchval(
        "SELECT 1 FROM pg_database WHERE datname = $1", "postgres_test"
    )
    if not exists:
        await conn.execute("CREATE DATABASE postgres_test")
    await conn.close()

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def tables(db_engine):
    """Apply Alembic migrations to bring the test DB to HEAD."""
    from alembic import command
    from alembic.config import Config

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option(
        "sqlalchemy.url",
        "postgresql+psycopg://liudetao:root@localhost/postgres_test",
    )
    command.upgrade(alembic_cfg, "head")
    yield
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(db_engine, tables) -> AsyncGenerator[AsyncSession]:
    """Function-scoped async session with rollback-based isolation.

    Opens a session with autocommit=False so SQLAlchemy starts a
    transaction automatically.  After the test we roll it back,
    undoing all flushes without ever issuing a SAVEPOINT — which
    would conflict with asyncpg's single-operation-per-connection
    model when ``selectinload`` triggers a second query.
    """
    session_factory = async_sessionmaker(
        bind=db_engine,
        expire_on_commit=False,
        autocommit=False,
    )
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.rollback()


# ─────────────────────────────────────────────────────────────────
# Phase 4 — API test fixtures
# ─────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def api_app(db_session, api_user) -> AsyncGenerator:
    """Lightweight FastAPI app for API tests.

    Includes routers + exception handlers but **no lifespan** (no
    Mongo/Redis/Taskiq initialization).  Overrides ``manager`` to
    return the test user's ID, and overrides service dependencies
    to use ``db_session`` instead of the production engine.

    Depends on ``api_user`` so the global user ID is always set
    before the auth override lambda runs.
    """
    from fastapi import FastAPI

    from app.api.des.auth import manager
    from app.core import register_exception_handlers
    from app.router import register_router

    test_app = FastAPI()
    register_router(test_app)
    register_exception_handlers(test_app)

    # Auth: return the test user's ID (set by ``api_user`` fixture
    # via the ``_api_user_id`` session attribute).
    test_app.dependency_overrides[manager] = lambda: _get_api_user_id()

    yield test_app

    test_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def api_client(api_app) -> AsyncGenerator[AsyncClient]:
    """Async HTTP client bound to the test app."""
    transport = ASGITransport(app=api_app)
    async with AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        yield client


_api_user_id: int | None = None


def _get_api_user_id() -> int:
    assert _api_user_id is not None, "api_user fixture must be used first"
    return _api_user_id


@pytest_asyncio.fixture
async def api_user(db_session) -> AsyncGenerator:
    """Create a test user and expose its ID to the auth override."""
    from app.models.models import User

    global _api_user_id
    user = User(username="apiuser", password="pass123")
    db_session.add(user)
    await db_session.flush()
    _api_user_id = user.id
    yield user
    _api_user_id = None
