"""Integration tests for app.services.monitor_service — requires test DB."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio

from app.models.models import User, VisitorTrack
from app.repositories.monitor_repo import MonitorRepo
from app.services.monitor_service import MonitorService

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def monitor_service(db_session):
    return MonitorService(MonitorRepo(db_session))


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


@pytest.mark.asyncio
async def test_get_overview(monitor_service, db_session):
    now = datetime.now(UTC)
    db_session.add(_make_visit(visit_time=now))
    db_session.add(_make_visit(visit_time=now, page_path="/blog"))
    await db_session.flush()

    overview = await monitor_service.get_overview(days=1)
    assert overview["total_visits"] == 2
    assert overview["unique_visitors"] == 1
    assert overview["period_days"] == 1
    assert len(overview["top_pages"]) > 0


@pytest.mark.asyncio
async def test_get_visitors(monitor_service, db_session):
    now = datetime.now(UTC)
    db_session.add(_make_visit(visit_time=now, visitor_id="v1"))
    db_session.add(_make_visit(visit_time=now, visitor_id="v2"))
    await db_session.flush()

    result = await monitor_service.get_visitors(days=1, page=1, page_size=10)
    assert result["total"] == 2
    assert len(result["list"]) == 2
    assert result["page"] == 1
    assert result["total_pages"] == 1


@pytest.mark.asyncio
async def test_get_visitors_pagination(monitor_service, db_session):
    now = datetime.now(UTC)
    for i in range(3):
        db_session.add(_make_visit(visit_time=now, visitor_id=f"v{i}"))
    await db_session.flush()

    result = await monitor_service.get_visitors(days=1, page=1, page_size=2)
    assert result["total"] == 3
    assert len(result["list"]) == 2
    assert result["total_pages"] == 2


@pytest.mark.asyncio
async def test_get_user_logins(monitor_service, db_session):
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

    result = await monitor_service.get_user_logins(days=1, page=1, page_size=10)
    assert result["total"] == 2
    usernames = {entry["username"] for entry in result["list"]}
    assert usernames == {"login1", "login2"}


@pytest.mark.asyncio
async def test_get_server_status(monitor_service):
    status = await monitor_service.get_server_status()
    assert "cpu_percent" in status
    assert "mem_total" in status
    assert "disk_total" in status
    assert status["cpu_cores"] > 0


@pytest.mark.asyncio
async def test_get_daily_summary(monitor_service, db_session):
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    db_session.add(_make_visit(visit_time=today_start + timedelta(hours=1)))
    db_session.add(_make_visit(visit_time=today_start + timedelta(hours=2)))
    await db_session.flush()

    summary = await monitor_service.get_daily_summary(now)
    assert summary["total_visits"] == 2
    assert summary["unique_visitors"] == 1
    assert "date" in summary
