"""Integration tests for app.services.system — requires test DB."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
import pytest_asyncio

from app.models.event import Event
from app.repositories.event_repo import EventRepo
from app.services.system import SystemService

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def system_service(db_session):
    return SystemService(EventRepo(db_session))


def _make_event(**overrides):
    now = datetime.now(UTC)
    data = {
        "type": "startup",
        "source": "boot",
        "title": "API 启动",
        "message": "test event",
        "timestamp": now,
    }
    data.update(overrides)
    return Event(**data)


@pytest.mark.asyncio
async def test_list_events_empty(system_service):
    items, pagination = await system_service.list_events()
    assert items == []
    assert pagination.total == 0
    assert pagination.pages == 0


@pytest.mark.asyncio
async def test_list_events_returns_items(system_service, db_session):
    db_session.add(_make_event(message="event1"))
    db_session.add(_make_event(message="event2"))
    await db_session.flush()

    items, pagination = await system_service.list_events()
    assert pagination.total == 2
    assert len(items) == 2
    assert pagination.has_prev is False
    assert pagination.has_next is False


@pytest.mark.asyncio
async def test_list_events_pagination(system_service, db_session):
    for i in range(5):
        db_session.add(_make_event(message=f"event{i}"))
    await db_session.flush()

    items, pagination = await system_service.list_events(
        page=1, per_page=2
    )
    assert pagination.total == 5
    assert pagination.pages == 3
    assert len(items) == 2
    assert pagination.has_next is True
    assert pagination.next_num == 2

    items2, _ = await system_service.list_events(page=3, per_page=2)
    assert len(items2) == 1


@pytest.mark.asyncio
async def test_list_events_filter_by_type(system_service, db_session):
    db_session.add(_make_event(type="startup", message="startup-event"))
    db_session.add(_make_event(type="deploy", message="deploy-event"))
    db_session.add(_make_event(type="startup", message="startup-event2"))
    await db_session.flush()

    items, pagination = await system_service.list_events(type="startup")
    assert pagination.total == 2
    assert all(item.type == "startup" for item in items)


@pytest.mark.asyncio
async def test_list_events_per_page_clamped(system_service, db_session):
    for i in range(5):
        db_session.add(_make_event(message=f"event{i}"))
    await db_session.flush()

    items, pagination = await system_service.list_events(
        per_page=9999
    )
    assert pagination.per_page == 200
    assert len(items) == 5


@pytest.mark.asyncio
async def test_list_events_page_minimum_one(system_service, db_session):
    db_session.add(_make_event(message="event1"))
    await db_session.flush()

    items, pagination = await system_service.list_events(page=0)
    assert pagination.page == 1
    assert len(items) == 1
