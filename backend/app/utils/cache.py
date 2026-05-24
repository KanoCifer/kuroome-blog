import asyncio
import inspect
import json
from datetime import datetime, timedelta
from functools import wraps
from typing import Any

import orjson
from cachetools.keys import hashkey
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from redis.asyncio import ConnectionPool
from redis.asyncio import Redis as AsyncRedis

from app.core import logger
from app.core.config import get_settings

CONNECTION_POOL = ConnectionPool.from_url(
    get_settings().REDIS_URL,
    decode_responses=True,
    max_connections=get_settings().REDIS_MAX_CONNECTIONS,
)


class CacheItem(BaseModel):
    value: Any
    expires_at: datetime


class AsyncCache:
    def __init__(self) -> None:
        self._cache: dict[str, CacheItem] = {}
        self._lock = asyncio.Lock()

    # 装饰器
    def __call__(
        self,
        func: Any | None = None,
        ttl: int = 60,
        exclude: list[str] | None = None,
    ) -> Any:
        """支持 @cache 和 @cache(ttl=xx) 两种用法"""
        exclude = exclude or []
        if func is not None:
            # 直接装饰: @cache
            return self.decorator(func, ttl, exclude)
        else:
            # 带参数装饰: @cache(ttl=60)
            return lambda func: self.decorator(func, ttl, exclude)

    def decorator(self, func: Any, ttl: int, exclude: list[str]) -> Any:
        """实际执行装饰的逻辑"""
        # 获取函数签名以支持参数绑定和排序
        func_signature = inspect.signature(func)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            bound_args = func_signature.bind(*args, **kwargs)
            bound_args.apply_defaults()

            # 过滤掉不参与缓存键生成的参数
            params = {
                k: v
                for k, v in bound_args.arguments.items()
                if k not in exclude
            }

            # 生成缓存键
            key = self._make_key(func.__name__, **params)

            cached_value = await self.get(key)
            if cached_value is not None:
                return cached_value

            result = await func(*args, **kwargs)
            await self.set(key, result, ttl)
            return result

        return wrapper

    def _make_key(self, *args, **kwargs):
        """生成唯一的缓存键"""
        key = hashkey(*args, **kwargs)
        return str(key)

    async def __setitem__(self, key: str, value: Any) -> None:
        """支持 cache[key] = value 方式设置缓存"""
        await self.set(key, value)

    async def __getitem__(self, key: str) -> Any:
        """支持 cache[key] 方式获取缓存"""
        return await self.get(key)

    async def set(self, key, value: Any, ttl: int = 60) -> None:
        expires_at: datetime = datetime.now() + timedelta(seconds=ttl)
        async with self._lock:
            self._cache[key] = CacheItem(value=value, expires_at=expires_at)

    async def get(self, key) -> Any:
        async with self._lock:
            if key not in self._cache:
                return None

            item: CacheItem = self._cache[key]
            if datetime.now() > item.expires_at:
                del self._cache[key]  # 过期则删除
                return None

            return item.value

    async def delete(self, key) -> None:
        async with self._lock:
            if key in self._cache:
                del self._cache[key]

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()


def _orjson_dumps(obj: Any) -> bytes:
    """使用 orjson 序列化; 回退到内置 json (兼容无法直接序列化的类型)。"""

    try:
        return orjson.dumps(obj)
    except TypeError:
        # orjson 对复杂对象（如 datetime、Pydantic 模型）可能报错，使用标准 json 做最后回退
        return json.dumps(obj, default=str).encode("utf-8")


def _orjson_loads(data: str | bytes) -> bytes:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return orjson.loads(data)


class AsyncRedisCache(AsyncCache):
    """基于 Redis 缓存"""

    def __init__(self, redis_client: AsyncRedis) -> None:
        super().__init__()
        self.redis: AsyncRedis = redis_client
        self._cache_prefix = "cache:"

    def __call__(
        self,
        func: Any | None = None,
        ttl: int = 60,
        exclude: list[str] | None = None,
    ) -> Any:
        return super().__call__(func, ttl, exclude)

    async def set(self, key, value: Any, ttl: int = 60) -> None:
        redis_key = self._cache_prefix + str(key)

        # 支持缓存 FastAPI 的 JSONResponse（包含 status_code / headers / body）
        if isinstance(value, JSONResponse):
            # JSONResponse.body 可能是 bytes 或 memoryview
            body_bytes = bytes(value.body)
            json_bytes = _orjson_dumps(
                {
                    "__type__": "JSONResponse",
                    "status_code": value.status_code,
                    "media_type": value.media_type,
                    "headers": dict(value.headers),
                    "body": body_bytes.decode("utf-8"),
                }
            )
        else:
            json_bytes: bytes = _orjson_dumps(value)

        await self.redis.set(redis_key, json_bytes, ex=ttl)

    async def get(self, key) -> Any:
        redis_key = self._cache_prefix + str(key)
        value = await self.redis.get(redis_key)
        if value is None:
            return None

        parsed = _orjson_loads(value)
        if (
            isinstance(parsed, dict)
            and parsed.get("__type__") == "JSONResponse"
        ):
            # 还原 JSONResponse
            body = parsed.get("body")
            try:
                content = (
                    _orjson_loads(body) if isinstance(body, str) else body
                )
            except Exception:
                # 如果 body 不是有效的 JSON（理论上不太可能），则当作原始字符串返回
                content = body

            return JSONResponse(
                content=content,
                status_code=int(parsed.get("status_code") or 200),
                media_type=parsed.get("media_type") or "application/json",
                headers=parsed.get("headers"),
            )

        return parsed

    def __setitem__(self, key, value: Any) -> None:
        asyncio.run(self.set(key, value))

    def __getitem__(self, key) -> Any:
        return asyncio.run(self.get(key))

    async def delete(self, key) -> None:
        redis_key = self._cache_prefix + str(key)
        await self.redis.delete(redis_key)

    async def clear(self) -> None:
        try:
            keys: list[str] = []
            async for key in self.redis.scan_iter(
                match=self._cache_prefix + "*", count=100
            ):
                keys.append(key)
            if keys:
                logger.info(f"Clearing {len(keys)} cache keys")
                for i in range(0, len(keys), 1000):
                    await self.redis.delete(*keys[i : i + 1000])
                logger.info("Cache cleared successfully")
            else:
                logger.info("No cache keys to clear")
        except Exception:
            logger.exception("Failed to clear cache")

    async def aclose(self) -> None:
        await self.redis.aclose()


def init_redis_cache() -> AsyncRedis:
    """Initialize Redis cache connection."""
    redis_cache_client: AsyncRedis = AsyncRedis(
        connection_pool=CONNECTION_POOL
    )
    return redis_cache_client


redis_cache = AsyncRedisCache(redis_client=init_redis_cache())


async def get_redis_cache() -> AsyncRedisCache:
    return redis_cache


async def close_cache_redis():
    await redis_cache.aclose()
