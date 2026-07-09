"""Unit tests for Redis-backed refresh token rotation.

These tests use fakeredis so they don't need a real Redis or Postgres.
They focus on the token lifecycle: create → refresh → rotation → logout.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import fakeredis
import pytest
from redis.asyncio import Redis as AsyncRedis

from app.api.des.auth import create_access_token
from app.services.user.core import UserService


class FakeRepo:
    """Minimal stub — these tests never hit the DB."""

    async def set_active_by_id(self, user_id: int, active: bool) -> None:
        pass


@pytest.fixture
def service() -> UserService:
    return UserService(repo=FakeRepo())  # type: ignore[arg-type]


@pytest.fixture
def redis() -> AsyncRedis:
    return fakeredis.FakeAsyncRedis(decode_responses=True)


USER_ID = 42


@pytest.mark.asyncio
async def test_create_tokens_stores_in_redis(service, redis):
    """create_tokens writes refresh:{user_id} when redis is provided."""

    class FakeUser:
        id = USER_ID

    tokens = await service.create_tokens(FakeUser(), redis)  # type: ignore[arg-type]
    stored = await redis.get(f"refresh:{USER_ID}")
    assert stored == tokens["refresh_token"]


@pytest.mark.asyncio
async def test_create_tokens_skips_redis_when_none(service):
    """create_tokens works without redis (backward-compatible)."""

    class FakeUser:
        id = USER_ID

    tokens = await service.create_tokens(FakeUser(), None)  # type: ignore[arg-type]
    assert "access_token" in tokens
    assert "refresh_token" in tokens


@pytest.fixture(autouse=True)
def _enable_strict_redis(monkeypatch):
    """Enable ENFORCE_REDIS_REFRESH for these tests."""
    from app.core.config import get_settings

    monkeypatch.setattr(
        get_settings(), "ENFORCE_REDIS_REFRESH", True
    )


@pytest.mark.asyncio
async def test_refresh_rotates_and_invalidates_old(service, redis, mocker):
    """After refresh, the old refresh token is rejected."""

    class FakeUser:
        id = USER_ID

    mocker.patch(
        "app.services.user.core.resolve_user_from_token",
        return_value=FakeUser(),
    )

    # Initial login
    first = await service.create_tokens(FakeUser(), redis)  # type: ignore[arg-type]

    # Refresh succeeds
    _, second = await service.refresh_user_token(
        first["refresh_token"], redis
    )
    assert second is not None
    assert second["refresh_token"] != first["refresh_token"]

    # Old refresh is now rejected (stale)
    result = await service.refresh_user_token(first["refresh_token"], redis)
    assert result is None


@pytest.mark.asyncio
async def test_logout_invalidates_refresh(service, redis, mocker):
    """After logout, refresh is rejected."""

    class FakeUser:
        id = USER_ID

    mocker.patch(
        "app.services.user.core.resolve_user_from_token",
        return_value=FakeUser(),
    )

    tokens = await service.create_tokens(FakeUser(), redis)  # type: ignore[arg-type]
    await service.logout(FakeUser(), redis)  # type: ignore[arg-type]

    result = await service.refresh_user_token(tokens["refresh_token"], redis)
    assert result is None


@pytest.mark.asyncio
async def test_access_token_ttl_is_one_hour():
    """Access token expires in ~1h (not the old 12h)."""
    from jose import jwt

    from app.core.config import get_settings

    before = datetime.now(UTC)
    token = create_access_token(sub="1", expires=timedelta(hours=1))
    payload = jwt.decode(
        token, get_settings().SECRET_KEY, algorithms=["HS256"]
    )
    exp = payload["exp"]
    # exp - now ≈ 1h (measured at token creation)
    delta = exp - int(before.timestamp())
    assert 3500 <= delta <= 3700  # ~1h with slack
