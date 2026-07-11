"""API integration tests for /api/v1/auth — login, register, me.

Tests the auth flow endpoints.  Login uses username/password against
the test DB.  Register requires Redis for email code validation, so
it is skipped here (covered by service-layer tests).  The ``me``
endpoint uses ``manager`` (user_id) which is overridden by the
``api_app`` fixture.
"""

from __future__ import annotations

import pytest
import pytest_asyncio

from app.models.models import User

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def login_user(db_session):
    """Create a user that can log in (username + password)."""
    u = User(username="loginuser", password="correctpass")
    db_session.add(u)
    await db_session.flush()
    return u


# ── POST /auth/login ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_success(api_client, api_user, login_user):
    resp = await api_client.post(
        "/api/v1/auth/login",
        json={
            "username": "loginuser",
            "password": "correctpass",
            "remember_me": False,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["message"] == "登录成功"
    assert "access_token" in body["data"]
    assert body["data"]["username"] == "loginuser"


@pytest.mark.asyncio
async def test_login_wrong_password(api_client, api_user, login_user):
    resp = await api_client.post(
        "/api/v1/auth/login",
        json={
            "username": "loginuser",
            "password": "wrongpass",
            "remember_me": False,
        },
    )
    assert resp.status_code == 401
    assert "用户名或密码错误" in resp.json()["message"]


@pytest.mark.asyncio
async def test_login_user_not_found(api_client, api_user, login_user):
    resp = await api_client.post(
        "/api/v1/auth/login",
        json={
            "username": "nouser",
            "password": "anypass",
            "remember_me": False,
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_validation_error(api_client, api_user, login_user):
    """Missing password → 422."""
    resp = await api_client.post(
        "/api/v1/auth/login",
        json={"username": "loginuser"},
    )
    assert resp.status_code == 422


# ── GET /auth/me ───────────────────────────────────────────────
# Skipped: me uses get_user_with_profile → get_by_id(with_profile=True)
# which uses selectinload.  selectinload triggers a second query on the
# same asyncpg connection, causing MissingGreenlet in the test session
# (same concurrent-operation limitation from Phase 3).


# ── POST /auth/logout ──────────────────────────────────────────
# Skipped: logout uses get_current_user_full → get_user() which opens
# a new production session via get_session(), not the test session.
# The test user isn't visible there.
