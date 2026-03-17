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
from redis.asyncio import Redis as AsyncRedis
from rich import print


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
            key = self._make_key(func.__name__, *params)

            cached_value = await self.get(key)
            if cached_value is not None:
                return cached_value

            result = await func(*args, **kwargs)
            await self.set(key, result, ttl)
            return result

        return wrapper

    def _make_key(self, *args, **kwargs):
        """生成唯一的缓存键"""
        return hashkey(*args, **kwargs)

    def __setitem__(self, key: str, value: Any) -> None:
        """支持 cache[key] = value 方式设置缓存"""
        asyncio.run(self.set(key, value))

    def __getitem__(self, key: str) -> Any:
        """支持 cache[key] 方式获取缓存"""
        return asyncio.run(self.get(key))

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


def _orjson_loads(data: str | bytes):
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
        keys = await self.redis.keys(pattern=self._cache_prefix + "*")
        if keys:
            await self.redis.delete(*keys)

    async def aclose(self) -> None:
        await self.redis.aclose()


cache = AsyncCache()
redis_cache = AsyncRedisCache(
    redis_client=AsyncRedis(
        host="localhost",
        port=6379,
        db=0,
        # 使用 bytes 存储，避免 Redis client 对响应做自动解码
        decode_responses=False,
        max_connections=10,
    )
)


# 依赖注入函数
async def get_cache() -> AsyncCache:
    return cache


async def get_redis_cache() -> AsyncRedisCache:
    return redis_cache


if __name__ == "__main__":
    import asyncio

    async def test_cache():
        @cache(ttl=5)
        async def expensive_computation(x):
            await asyncio.sleep(1)  # 模拟耗时操作
            return x * x

        print(await expensive_computation(2))  # 计算并缓存结果
        print(await expensive_computation(2))  # 从缓存获取结果
        await asyncio.sleep(6)  # 等待缓存过期
        print(await expensive_computation(2))  # 重新计算并缓存结果

    asyncio.run(test_cache())

    # 测试 Redis 缓存
    async def test_redis_cache():
        @redis_cache(ttl=5)
        async def get_data_from_db(x):
            await asyncio.sleep(1)  # 模拟数据库查询
            return f"Data for {x}"

        print(await get_data_from_db(1))  # 从缓存获取结果

        await redis_cache.set("test_key", "test_value", ttl=5)
        print(await redis_cache.get("test_key"))  # 输出: test_value
        await asyncio.sleep(6)
        print(await redis_cache.get("test_key"))  # 输出: None (已过期)

    asyncio.run(test_redis_cache())
