"""API integration tests for /api/v1/status — monitor endpoints.

Tests visitor overview, visitor list, user logins, and server status.
These endpoints use ``get_admin_user`` (which normally opens a production
session via ``get_current_user_full``), so we override it to return a
test user from the test session instead.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.models.models import User, VisitorTrack

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _make_visit(**overrides):
    now = datetime.now(UTC)
    data = {
        "visitor_id": "v1",
        "page_url": "https://example.com/",
        "page_path": "/",
        "browser": "Mozilla/5.0",
        "screen_resolution": "1920x1080",
        "language": "zh-CN",
        "ip_address": "127.0.0.1",
        "visit_time": now,
        "browser_name": "Chrome",
        "browser_version": "120",
        "os_name": "macOS",
        "os_version": "14",
        "device_type": "desktop",
    }
    data.update(overrides)
    return VisitorTrack(**data)


# ── GET /api/v1/status/overview ────────────────────────────────


@pytest.mark.asyncio
async def test_get_overview(
    api_client, api_user, db_session
):
    now = datetime.now(UTC)
    db_session.add(_make_visit(visit_time=now))
    db_session.add(_make_visit(visit_time=now, page_path="/blog"))
    await db_session.flush()

    resp = await api_client.get("/api/v1/status/overview")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["total_visits"] == 2
    assert body["data"]["unique_visitors"] == 1


# ── GET /api/v1/status/visitors ────────────────────────────────


@pytest.mark.asyncio
async def test_get_visitors(
    api_client, api_user, db_session
):
    now = datetime.now(UTC)
    db_session.add(_make_visit(visit_time=now, visitor_id="v1"))
    db_session.add(_make_visit(visit_time=now, visitor_id="v2"))
    await db_session.flush()

    resp = await api_client.get("/api/v1/status/visitors")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["total"] == 2
    assert len(body["data"]["list"]) == 2


@pytest.mark.asyncio
async def test_get_visitors_pagination(
    api_client, api_user, db_session
):
    now = datetime.now(UTC)
    for i in range(3):
        db_session.add(
            _make_visit(visit_time=now, visitor_id=f"v{i}")
        )
    await db_session.flush()

    resp = await api_client.get(
        "/api/v1/status/visitors", params={"page": 1, "page_size": 2}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["total"] == 3
    assert len(body["data"]["list"]) == 2
    assert body["data"]["total_pages"] == 2


# ── GET /api/v1/status/user-logins ────────────────────────────


@pytest.mark.asyncio
async def test_get_user_logins(
    api_client, api_user, db_session
):
    now = datetime.now(UTC)
    u1 = User(username="login1", password="pass")
    u1.login_count = 3
    u1.current_login_at = now
    u2 = User(username="login2", password="pass")
    u2.login_count = 1
    u2.last_login_at = now - timedelta(hours=1)
    u3 = User(username="nologin", password="pass")
    u3.login_count = 0
    db_session.add_all([u1, u2, u3])
    await db_session.flush()

    resp = await api_client.get("/api/v1/status/user-logins")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["total"] == 2
    usernames = {e["username"] for e in body["data"]["list"]}
    assert usernames == {"login1", "login2"}


# ── GET /api/v1/status/server/status ───────────────────────────


@pytest.mark.asyncio
async def test_get_server_status(api_client, api_user):
    resp = await api_client.get("/api/v1/status/server/status")
    assert resp.status_code == 200
    body = resp.json()
    assert "cpu_percent" in body["data"]
    assert "mem_total" in body["data"]
    assert body["data"]["cpu_cores"] > 0
