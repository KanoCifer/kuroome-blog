"""Integration tests for app.repositories.monitor_repo — requires test DB."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio

from app.models.models import User, VisitorTrack
from app.repositories.monitor_repo import MonitorRepo

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def monitor_repo(db_session):
    return MonitorRepo(db_session)


def _make_visit(**overrides):
    now = datetime.now(UTC)
    data = {
        "visitor_id": "visitor-1",
        "page_url": "https://example.com/blog",
        "page_path": "/blog",
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
async def test_count_visits_between(monitor_repo):
    now = datetime.now(UTC)
    past = now - timedelta(hours=1)
    future = now + timedelta(hours=1)

    monitor_repo.session.add(_make_visit(visit_time=past))
    monitor_repo.session.add(_make_visit(visit_time=now))
    monitor_repo.session.add(_make_visit(visit_time=future))
    await monitor_repo.session.flush()

    start = now - timedelta(minutes=30)
    end = now + timedelta(minutes=30)
    count = await monitor_repo.count_visits_between(start, end)
    assert count == 1


@pytest.mark.asyncio
async def test_count_unique_visitors_between(monitor_repo):
    now = datetime.now(UTC)
    monitor_repo.session.add(_make_visit(visitor_id="v1", visit_time=now))
    monitor_repo.session.add(_make_visit(visitor_id="v1", visit_time=now))
    monitor_repo.session.add(_make_visit(visitor_id="v2", visit_time=now))
    await monitor_repo.session.flush()

    count = await monitor_repo.count_unique_visitors_between(
        now - timedelta(minutes=1), now + timedelta(minutes=1)
    )
    assert count == 2


@pytest.mark.asyncio
async def test_count_unique_ips_between(monitor_repo):
    now = datetime.now(UTC)
    monitor_repo.session.add(_make_visit(ip_address="1.1.1.1", visit_time=now))
    monitor_repo.session.add(_make_visit(ip_address="1.1.1.1", visit_time=now))
    monitor_repo.session.add(_make_visit(ip_address="2.2.2.2", visit_time=now))
    await monitor_repo.session.flush()

    count = await monitor_repo.count_unique_ips_between(
        now - timedelta(minutes=1), now + timedelta(minutes=1)
    )
    assert count == 2


@pytest.mark.asyncio
async def test_get_top_pages_between(monitor_repo):
    now = datetime.now(UTC)
    for _ in range(5):
        monitor_repo.session.add(_make_visit(page_path="/popular", visit_time=now))
    for _ in range(2):
        monitor_repo.session.add(_make_visit(page_path="/less", visit_time=now))
    await monitor_repo.session.flush()

    top = await monitor_repo.get_top_pages_between(
        now - timedelta(minutes=1), now + timedelta(minutes=1), limit=2
    )
    assert len(top) == 2
    assert top[0]["page_path"] == "/popular"
    assert top[0]["count"] == 5


@pytest.mark.asyncio
async def test_get_browser_stats_between(monitor_repo):
    now = datetime.now(UTC)
    monitor_repo.session.add(
        _make_visit(browser_name="Chrome", visitor_id="v1", visit_time=now)
    )
    monitor_repo.session.add(
        _make_visit(browser_name="Chrome", visitor_id="v2", visit_time=now)
    )
    monitor_repo.session.add(
        _make_visit(browser_name="Firefox", visitor_id="v3", visit_time=now)
    )
    await monitor_repo.session.flush()

    stats = await monitor_repo.get_browser_stats_between(
        now - timedelta(minutes=1), now + timedelta(minutes=1)
    )
    assert len(stats) == 2
    assert stats[0]["browser_name"] == "Chrome"
    assert stats[0]["count"] == 2


@pytest.mark.asyncio
async def test_get_os_stats_between(monitor_repo):
    now = datetime.now(UTC)
    monitor_repo.session.add(
        _make_visit(os_name="macOS", visitor_id="v1", visit_time=now)
    )
    monitor_repo.session.add(
        _make_visit(os_name="Windows", visitor_id="v2", visit_time=now)
    )
    await monitor_repo.session.flush()

    stats = await monitor_repo.get_os_stats_between(
        now - timedelta(minutes=1), now + timedelta(minutes=1)
    )
    assert len(stats) == 2


@pytest.mark.asyncio
async def test_get_device_stats_between(monitor_repo):
    now = datetime.now(UTC)
    monitor_repo.session.add(
        _make_visit(device_type="desktop", visitor_id="v1", visit_time=now)
    )
    monitor_repo.session.add(
        _make_visit(device_type="mobile", visitor_id="v2", visit_time=now)
    )
    monitor_repo.session.add(
        _make_visit(device_type="mobile", visitor_id="v3", visit_time=now)
    )
    await monitor_repo.session.flush()

    stats = await monitor_repo.get_device_stats_between(
        now - timedelta(minutes=1), now + timedelta(minutes=1)
    )
    assert stats[0]["device_type"] == "mobile"
    assert stats[0]["count"] == 2


@pytest.mark.asyncio
async def test_count_visits_since(monitor_repo):
    now = datetime.now(UTC)
    old = now - timedelta(days=10)
    monitor_repo.session.add(_make_visit(visit_time=old))
    monitor_repo.session.add(_make_visit(visit_time=now))
    await monitor_repo.session.flush()

    count = await monitor_repo.count_visits_since(now - timedelta(days=1))
    assert count == 1


@pytest.mark.asyncio
async def test_list_visitors_since(monitor_repo):
    now = datetime.now(UTC)
    old = now - timedelta(days=10)
    monitor_repo.session.add(_make_visit(visit_time=old, visitor_id="old"))
    monitor_repo.session.add(_make_visit(visit_time=now, visitor_id="new"))
    await monitor_repo.session.flush()

    results = await monitor_repo.list_visitors_since(
        now - timedelta(days=1), offset=0, limit=10
    )
    assert len(results) == 1
    assert results[0].visitor_id == "new"


@pytest.mark.asyncio
async def test_list_visitors_since_pagination(monitor_repo):
    now = datetime.now(UTC)
    for i in range(5):
        monitor_repo.session.add(
            _make_visit(visitor_id=f"v{i}", visit_time=now)
        )
    await monitor_repo.session.flush()

    page1 = await monitor_repo.list_visitors_since(
        now - timedelta(minutes=1), offset=0, limit=2
    )
    page2 = await monitor_repo.list_visitors_since(
        now - timedelta(minutes=1), offset=2, limit=2
    )
    assert len(page1) == 2
    assert len(page2) == 2


@pytest.mark.asyncio
async def test_list_users_with_login_records(monitor_repo, db_session):
    u1 = User(username="active1", password="pass")
    u1.login_count = 5
    u2 = User(username="active2", password="pass")
    u2.login_count = 1
    u3 = User(username="inactive", password="pass")
    u3.login_count = 0
    db_session.add_all([u1, u2, u3])
    await db_session.flush()

    results = await monitor_repo.list_users_with_login_records()
    assert len(results) == 2
    assert all(u.login_count > 0 for u in results)


@pytest.mark.asyncio
async def test_list_users_by_ids_empty(monitor_repo):
    assert await monitor_repo.list_users_by_ids([]) == []
