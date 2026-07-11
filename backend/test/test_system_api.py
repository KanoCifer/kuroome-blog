"""API integration tests for /api/v2/system — event listing.

Tests the system ping and event endpoints with pagination and filtering.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.models.event import Event

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _make_event(**overrides):
    data = {
        "type": "startup",
        "source": "boot",
        "title": "API 启动",
        "message": "test event",
        "timestamp": datetime.now(UTC),
    }
    data.update(overrides)
    return Event(**data)


# ── GET /api/v2/system/ (ping) ────────────────────────────────


@pytest.mark.asyncio
async def test_system_ping(api_client, api_user):
    resp = await api_client.get("/api/v2/system/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── GET /api/v2/system/events ─────────────────────────────────


@pytest.mark.asyncio
async def test_list_events_empty(api_client, api_user):
    resp = await api_client.get("/api/v2/system/events")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["items"] == []
    assert body["data"]["pagination"]["total"] == 0


@pytest.mark.asyncio
async def test_list_events_returns_items(
    api_client, api_user, db_session
):
    db_session.add(_make_event(message="event1"))
    db_session.add(_make_event(message="event2"))
    await db_session.flush()

    resp = await api_client.get("/api/v2/system/events")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["pagination"]["total"] == 2
    assert len(body["data"]["items"]) == 2


@pytest.mark.asyncio
async def test_list_events_pagination(
    api_client, api_user, db_session
):
    for i in range(5):
        db_session.add(_make_event(message=f"event{i}"))
    await db_session.flush()

    resp = await api_client.get(
        "/api/v2/system/events", params={"page": 1, "per_page": 2}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["pagination"]["total"] == 5
    assert body["data"]["pagination"]["pages"] == 3
    assert len(body["data"]["items"]) == 2
    assert body["data"]["pagination"]["has_next"] is True


@pytest.mark.asyncio
async def test_list_events_filter_by_type(
    api_client, api_user, db_session
):
    db_session.add(_make_event(type="startup", message="startup-event"))
    db_session.add(_make_event(type="deploy", message="deploy-event"))
    db_session.add(_make_event(type="startup", message="startup-event2"))
    await db_session.flush()

    resp = await api_client.get(
        "/api/v2/system/events", params={"type": "deploy"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["pagination"]["total"] == 1
    assert body["data"]["items"][0]["type"] == "deploy"
