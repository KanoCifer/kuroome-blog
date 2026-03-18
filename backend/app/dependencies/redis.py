from __future__ import annotations

from fastapi import FastAPI, Request
from redis.asyncio import ConnectionPool
from redis.asyncio import Redis as AsyncRedis

CONNECTION_POOL = ConnectionPool(
    host="localhost",
    port=6379,
    db=0,
    decode_responses=True,
    max_connections=10,
)

CONNECTION_POOL_2 = ConnectionPool(
    host="localhost",
    port=6379,
    db=2,
    decode_responses=True,
    max_connections=10,
)


async def init_redis():
    """Initialize Redis connection pool."""
    redis: AsyncRedis = AsyncRedis(connection_pool=CONNECTION_POOL)

    redis2: AsyncRedis = AsyncRedis(connection_pool=CONNECTION_POOL_2)

    return redis, redis2


# ----------------------
# 1. 异步 Redis 配置
# ----------------------
async def get_async_redis(request: Request):
    """FastAPI dependency for async Redis client."""
    return request.app.state.redis2


async def get_redis(request: Request):
    """FastAPI dependency for async Redis client."""
    return request.app.state.redis


async def close_redis(app: FastAPI):
    """Close Redis connections on application shutdown."""
    if app.state.redis is not None:
        await app.state.redis.aclose()
        app.state.redis = None
    if app.state.redis2 is not None:
        await app.state.redis2.aclose()
        app.state.redis2 = None
