"""API integration tests for /api/v2/system — log listing.

Tests the system log endpoint with pagination and filtering.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
import pytest_asyncio

from app.api.des.des import system_service_dep
from app.models.log import Log
from app.repositories.log_repo import LogRepo
from app.services.system import SystemService

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def system_override(api_app, db_session):
    """Override system_service_dep to use the test session."""

    async def _override():
        yield SystemService(LogRepo(db_session))

    api_app.dependency_overrides[system_service_dep] = _override
    yield
    del api_app.dependency_overrides[system_service_dep]


def _make_log(**overrides):
    data = {
        "level": "INFO",
        "message": "test log",
        "timestamp": datetime.now(UTC),
    }
    data.update(overrides)
    return Log(**data)


# ── GET /api/v2/system/ (ping) ────────────────────────────────


@pytest.mark.asyncio
async def test_system_ping(api_client):
    resp = await api_client.get("/api/v2/system/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ── GET /api/v2/system/log ────────────────────────────────────


@pytest.mark.asyncio
async def test_list_logs_empty(api_client, system_override):
    resp = await api_client.get("/api/v2/system/log")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["items"] == []
    assert body["data"]["pagination"]["total"] == 0


@pytest.mark.asyncio
async def test_list_logs_returns_items(
    api_client, system_override, db_session
):
    db_session.add(_make_log(message="log1"))
    db_session.add(_make_log(message="log2"))
    await db_session.flush()

    resp = await api_client.get("/api/v2/system/log")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["pagination"]["total"] == 2
    assert len(body["data"]["items"]) == 2


@pytest.mark.asyncio
async def test_list_logs_pagination(
    api_client, system_override, db_session
):
    for i in range(5):
        db_session.add(_make_log(message=f"log{i}"))
    await db_session.flush()

    resp = await api_client.get(
        "/api/v2/system/log", params={"page": 1, "per_page": 2}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["pagination"]["total"] == 5
    assert body["data"]["pagination"]["pages"] == 3
    assert len(body["data"]["items"]) == 2
    assert body["data"]["pagination"]["has_next"] is True


@pytest.mark.asyncio
async def test_list_logs_filter_by_level(
    api_client, system_override, db_session
):
    db_session.add(_make_log(level="INFO", message="info-log"))
    db_session.add(_make_log(level="ERROR", message="error-log"))
    db_session.add(_make_log(level="INFO", message="info-log2"))
    await db_session.flush()

    resp = await api_client.get(
        "/api/v2/system/log", params={"level": "ERROR"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["pagination"]["total"] == 1
    assert body["data"]["items"][0]["level"] == "ERROR"
