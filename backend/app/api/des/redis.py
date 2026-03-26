from __future__ import annotations

from fastapi import FastAPI, Request
from redis.asyncio import ConnectionPool
from redis.asyncio import Redis as AsyncRedis

from app.core.config import settings

# 统一的 Redis 连接池，使用配置中的 URL 和参数
CONNECTION_POOL = ConnectionPool.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    max_connections=settings.REDIS_MAX_CONNECTIONS,
)


async def init_redis():
    """Initialize Redis connection pool.

    Returns two Redis clients for backward compatibility.
    Both clients use the same connection pool pointing to db0.
    """
    # 两个客户端使用同一个连接池，保持向后兼容
    redis: AsyncRedis = AsyncRedis(connection_pool=CONNECTION_POOL)
    redis2: AsyncRedis = AsyncRedis(connection_pool=CONNECTION_POOL)

    return redis, redis2


# ----------------------
# 异步 Redis 依赖
# ----------------------
async def get_async_redis(request: Request):
    """FastAPI dependency for async Redis client.

    Note: This returns the same client as get_redis for backward compatibility.
    Both now use the unified db0 connection.
    """
    return request.app.state.redis2


async def get_redis(request: Request):
    """FastAPI dependency for async Redis client.

    Uses the unified db0 connection.
    """
    return request.app.state.redis


async def close_redis(app: FastAPI):
    """Close Redis connections on application shutdown."""
    if app.state.redis is not None:
        await app.state.redis.aclose()
        app.state.redis = None
    if app.state.redis2 is not None:
        await app.state.redis2.aclose()
        app.state.redis2 = None

    # 关闭连接池
    if CONNECTION_POOL is not None:
        await CONNECTION_POOL.disconnect()
