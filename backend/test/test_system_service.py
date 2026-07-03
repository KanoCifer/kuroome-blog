"""Integration tests for app.services.system — requires test DB."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
import pytest_asyncio

from app.models.log import Log
from app.repositories.log_repo import LogRepo
from app.services.system import SystemService

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def system_service(db_session):
    return SystemService(LogRepo(db_session))


def _make_log(**overrides):
    now = datetime.now(UTC)
    data = {
        "level": "info",
        "message": "test log",
        "timestamp": now,
    }
    data.update(overrides)
    return Log(**data)


@pytest.mark.asyncio
async def test_list_logs_empty(system_service):
    items, pagination = await system_service.list_logs()
    assert items == []
    assert pagination.total == 0
    assert pagination.pages == 0


@pytest.mark.asyncio
async def test_list_logs_returns_items(system_service, db_session):
    db_session.add(_make_log(message="log1"))
    db_session.add(_make_log(message="log2"))
    await db_session.flush()

    items, pagination = await system_service.list_logs()
    assert pagination.total == 2
    assert len(items) == 2
    assert pagination.has_prev is False
    assert pagination.has_next is False


@pytest.mark.asyncio
async def test_list_logs_pagination(system_service, db_session):
    for i in range(5):
        db_session.add(_make_log(message=f"log{i}"))
    await db_session.flush()

    items, pagination = await system_service.list_logs(
        page=1, per_page=2
    )
    assert pagination.total == 5
    assert pagination.pages == 3
    assert len(items) == 2
    assert pagination.has_next is True
    assert pagination.next_num == 2

    items2, _ = await system_service.list_logs(page=3, per_page=2)
    assert len(items2) == 1


@pytest.mark.asyncio
async def test_list_logs_filter_by_level(system_service, db_session):
    db_session.add(_make_log(level="info", message="info-log"))
    db_session.add(_make_log(level="error", message="error-log"))
    db_session.add(_make_log(level="info", message="info-log2"))
    await db_session.flush()

    items, pagination = await system_service.list_logs(level="info")
    assert pagination.total == 2
    assert all(item.level == "info" for item in items)


@pytest.mark.asyncio
async def test_list_logs_per_page_clamped(system_service, db_session):
    for i in range(5):
        db_session.add(_make_log(message=f"log{i}"))
    await db_session.flush()

    items, pagination = await system_service.list_logs(
        per_page=9999
    )
    assert pagination.per_page == 200
    assert len(items) == 5


@pytest.mark.asyncio
async def test_list_logs_page_minimum_one(system_service, db_session):
    db_session.add(_make_log(message="log1"))
    await db_session.flush()

    items, pagination = await system_service.list_logs(page=0)
    assert pagination.page == 1
    assert len(items) == 1
