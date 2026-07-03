"""Integration tests for app.repositories.log_repo — requires test DB."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio

from app.models.log import Log
from app.repositories.log_repo import LogRepo

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def log_repo(db_session):
    return LogRepo(db_session)


@pytest_asyncio.fixture
async def sample_logs(db_session):
    """Insert a batch of logs with varying levels and timestamps."""
    now = datetime.now(UTC)
    logs = [
        Log(level="INFO", message="info 1", timestamp=now - timedelta(hours=3)),
        Log(level="INFO", message="info 2", timestamp=now - timedelta(hours=2)),
        Log(level="WARNING", message="warn 1", timestamp=now - timedelta(hours=1)),
        Log(level="ERROR", message="error 1", timestamp=now),
    ]
    for log in logs:
        db_session.add(log)
    await db_session.flush()
    return logs


@pytest.mark.asyncio
async def test_get_logs_returns_all_when_no_filter(log_repo, sample_logs):
    result = await log_repo.get_logs()
    assert len(result) == 4


@pytest.mark.asyncio
async def test_get_logs_orders_by_timestamp_desc(log_repo, sample_logs):
    result = await log_repo.get_logs()
    timestamps = [log.timestamp for log in result]
    assert timestamps == sorted(timestamps, reverse=True)


@pytest.mark.asyncio
async def test_get_logs_filters_by_level(log_repo, sample_logs):
    result = await log_repo.get_logs(level="INFO")
    assert len(result) == 2
    assert all(log.level == "INFO" for log in result)


@pytest.mark.asyncio
async def test_get_logs_filters_by_time_range(log_repo, sample_logs):
    now = datetime.now(UTC)
    result = await log_repo.get_logs(
        start=now - timedelta(hours=2, minutes=30),
        end=now - timedelta(minutes=30),
    )
    assert len(result) == 2


@pytest.mark.asyncio
async def test_get_logs_pagination(log_repo, sample_logs):
    page1 = await log_repo.get_logs(offset=0, limit=2)
    page2 = await log_repo.get_logs(offset=2, limit=2)
    assert len(page1) == 2
    assert len(page2) == 2
    # No overlap between pages
    ids1 = {log.id for log in page1}
    ids2 = {log.id for log in page2}
    assert ids1.isdisjoint(ids2)


@pytest.mark.asyncio
async def test_get_logs_returns_empty_when_no_match(log_repo, sample_logs):
    result = await log_repo.get_logs(level="DEBUG")
    assert result == []


@pytest.mark.asyncio
async def test_count_logs_returns_total(log_repo, sample_logs):
    count = await log_repo.count_logs()
    assert count == 4


@pytest.mark.asyncio
async def test_count_logs_with_level_filter(log_repo, sample_logs):
    assert await log_repo.count_logs(level="INFO") == 2
    assert await log_repo.count_logs(level="ERROR") == 1
    assert await log_repo.count_logs(level="DEBUG") == 0


@pytest.mark.asyncio
async def test_count_logs_with_time_range(log_repo, sample_logs):
    now = datetime.now(UTC)
    count = await log_repo.count_logs(
        start=now - timedelta(hours=1, minutes=30),
    )
    assert count == 2
