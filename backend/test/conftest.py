"""Shared pytest fixtures for backend test suite.

Phase 1 — minimal infrastructure:
- ``settings``: cached settings.

Phase 3 — DB-backed fixtures:
- ``db_engine``: async SQLAlchemy engine pointing at the test database.
- ``db_session``: function-scoped async session with automatic rollback.
- ``tables`` / ``drop_tables``: create/drop all SQLAlchemy models.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.models import Base

TEST_DATABASE_URL = "postgresql+asyncpg://liudetao:root@localhost/postgres"


@pytest.fixture(scope="session")
def settings():
    """Return settings with a deterministic secret for tests."""
    get_settings.cache_clear()
    return get_settings()


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """Create a test database engine (session-scoped)."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def tables(db_engine):
    """Create all tables once per test session."""
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
