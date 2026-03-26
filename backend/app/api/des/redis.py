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


async def init_redis() -> AsyncRedis:
    """Initialize Redis connection pool."""
    return AsyncRedis(connection_pool=CONNECTION_POOL)


# ----------------------
# 异步 Redis 依赖
# ----------------------
async def get_redis(request: Request):
    """FastAPI dependency for async Redis client."""
    return request.app.state.redis


async def close_redis(app: FastAPI):
    """Close Redis connections on application shutdown."""
    if app.state.redis is not None:
        await app.state.redis.aclose()
        app.state.redis = None

    # 关闭连接池
    if CONNECTION_POOL is not None:
        await CONNECTION_POOL.disconnect()
