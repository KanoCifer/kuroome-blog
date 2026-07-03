"""Integration tests for app.plugins.cache.cache — uses a real local Redis.

Requires a running Redis at the configured REDIS_URL (default redis://localhost:6379/0).
Tests are skipped automatically if Redis is unreachable.  All test keys live
under the cache's built-in ``cache:`` prefix and the selected DB is flushed
before and after the session.

Note
----
All async tests use the *session* event loop (``loop_scope="session"``) so they
share the same loop as the session-scoped Redis client fixture — Redis Futures
cannot cross loop boundaries.
"""

from __future__ import annotations

import asyncio

import pytest
import pytest_asyncio
from pydantic import BaseModel
from redis.asyncio import Redis as AsyncRedis
from redis.exceptions import ConnectionError as RedisConnectionError

from app.core.config import get_settings
from app.plugins.cache.cache import AsyncCache

# Every async test in this module shares the session loop.
pytestmark = pytest.mark.asyncio(loop_scope="session")


async def _wait_for_redis(client: AsyncRedis, timeout: float = 3.0) -> bool:
    """Return True if Redis responds to PING within *timeout* seconds."""
    try:
        await asyncio.wait_for(client.ping(), timeout=timeout)
    except (RedisConnectionError, TimeoutError, OSError):
        return False
    return True


@pytest_asyncio.fixture(scope="session")
async def redis_client():
    """Session-scoped real Redis client.  Skips the whole module if unavailable."""
    client = AsyncRedis.from_url(
        get_settings().REDIS_URL,
        decode_responses=True,
        max_connections=5,
    )
    if not await _wait_for_redis(client):
        await client.aclose()
        pytest.skip("Redis is not reachable — skipping cache integration tests")

    await client.flushdb()
    yield client
    await client.flushdb()
    await client.aclose()


@pytest.fixture
def cache(redis_client: AsyncRedis) -> AsyncCache:
    """Cache instance backed by the real Redis client."""
    return AsyncCache(redis_client=redis_client)


# ── _make_key ────────────────────────────────────────────────


def test_make_key_contains_func_name(cache: AsyncCache):
    key = cache._make_key("get_weather", location="Beijing")
    assert key.startswith("get_weather|")


def test_make_key_is_deterministic(cache: AsyncCache):
    k1 = cache._make_key("fn", a=1, b=2)
    k2 = cache._make_key("fn", a=1, b=2)
    assert k1 == k2


def test_make_key_differs_with_params(cache: AsyncCache):
    k1 = cache._make_key("fn", a=1)
    k2 = cache._make_key("fn", a=2)
    assert k1 != k2


def test_make_key_diffs_by_func_name(cache: AsyncCache):
    k1 = cache._make_key("fn_a", x=1)
    k2 = cache._make_key("fn_b", x=1)
    assert k1 != k2


# ── set / get serialization ───────────────────────────────────


async def test_set_and_get_dict(cache: AsyncCache):
    await cache.set("dictkey", {"temp": 25}, ttl=60)
    assert await cache.get("dictkey") == {"temp": 25}


async def test_set_and_get_pydantic_model(cache: AsyncCache):
    class Forecast(BaseModel):
        temp: int
        city: str

    await cache.set("pydantickey", Forecast(temp=20, city="Tokyo"), ttl=60)
    assert await cache.get("pydantickey") == {"temp": 20, "city": "Tokyo"}


async def test_get_returns_none_for_missing_key(cache: AsyncCache):
    assert await cache.get("nonexistent") is None


async def test_set_overwrites_previous_value(cache: AsyncCache):
    await cache.set("k", {"v": 1}, ttl=60)
    await cache.set("k", {"v": 2}, ttl=60)
    assert await cache.get("k") == {"v": 2}


async def test_ttl_is_applied(redis_client: AsyncRedis, cache: AsyncCache):
    await cache.set("ttlkey", {"x": 1}, ttl=2)
    ttl = await redis_client.ttl(cache._cache_prefix + "ttlkey")
    assert 0 < ttl <= 2


async def test_ttl_expire_makes_get_return_none(cache: AsyncCache):
    await cache.set("expirekey", {"x": 1}, ttl=1)
    await asyncio.sleep(1.5)
    assert await cache.get("expirekey") is None


# ── invalidate ───────────────────────────────────────────────


async def test_invalidate_deletes_matching_keys(cache: AsyncCache):
    await cache.set("fn_a|p1", {"a": 1}, ttl=60)
    await cache.set("fn_a|p2", {"a": 2}, ttl=60)
    await cache.set("fn_b|p1", {"b": 1}, ttl=60)

    deleted = await cache.invalidate("fn_a")

    assert deleted == 2
    assert await cache.get("fn_a|p1") is None
    assert await cache.get("fn_a|p2") is None
    assert await cache.get("fn_b|p1") is not None


async def test_invalidate_with_no_names_returns_zero(cache: AsyncCache):
    assert await cache.invalidate() == 0


async def test_invalidate_with_no_matches_returns_zero(cache: AsyncCache):
    deleted = await cache.invalidate("nonexistent")
    assert deleted == 0


async def test_invalidate_multiple_names(cache: AsyncCache):
    await cache.set("fa|x", {"a": 1}, ttl=60)
    await cache.set("fb|y", {"b": 2}, ttl=60)
    await cache.set("fc|z", {"c": 3}, ttl=60)

    deleted = await cache.invalidate("fa", "fb")

    assert deleted == 2
    assert await cache.get("fa|x") is None
    assert await cache.get("fb|y") is None
    assert await cache.get("fc|z") is not None


# ── clear ───────────────────────────────────────────────────


async def test_clear_removes_all_keys(cache: AsyncCache):
    await cache.set("a|1", {"a": 1}, ttl=60)
    await cache.set("b|2", {"b": 2}, ttl=60)
    await cache.clear()
    assert await cache.get("a|1") is None
    assert await cache.get("b|2") is None


# ── prefix verification ─────────────────────────────────────


async def test_internal_key_format_includes_prefix(redis_client: AsyncRedis):
    """Verify the 'cache:' prefix is applied before writing to Redis."""
    cache = AsyncCache(redis_client=redis_client)
    await cache.set("mykey", {"x": 1}, ttl=60)
    exists = await redis_client.exists(cache._cache_prefix + "mykey")
    assert exists == 1
