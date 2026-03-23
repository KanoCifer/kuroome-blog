import asyncio
import uuid
from contextlib import asynccontextmanager

from redis.asyncio import Redis as AsyncRedis

UNLOCK_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


class LockAcquireError(Exception):
    """Redis锁获取失败异常"""

    def __init__(self, message: str):
        super().__init__(message)


@asynccontextmanager
async def get_redis_lock(
    redis: AsyncRedis,
    key: str,
    ttl: int,
    retries: int = 0,
    retry_interval: float = 0.1,
):
    """异步的Redis分布式锁。


    :param:
        redis: Redis客户端实例
        key: 锁的键名
        ttl: 锁的过期时间，单位秒
        retries: 获取锁失败时的重试次数，默认0不重试
        retry_interval: 重试间隔时间，单位秒，默认0.5秒
    :raises LockAcquireError: 当无法获取锁时抛出
    :yields: 成功获取锁后进入上下文，退出时自动释放锁
    """

    lock_key = f"lock:{key}"
    value = str(uuid.uuid4())  # 生成唯一的锁值
    acquired = False
    retry_interval = max(retry_interval, 0.1)  # 确保重试间隔不小于0.1秒

    try:
        # 尝试获取锁，支持重试
        for attempt in range(retries + 1):
            acquired: bool = bool(
                await redis.set(lock_key, value, nx=True, ex=ttl)
            )
            if acquired:
                break
            if attempt < retries:
                await asyncio.sleep(retry_interval)

        if not acquired:
            raise LockAcquireError(f"无法获取锁: {lock_key}")

        yield  # 锁已获取，执行上下文中的代码
    finally:
        # 释放锁，使用Lua脚本确保原子性
        if acquired:
            await redis.eval(UNLOCK_SCRIPT, 1, lock_key, value)  # type: ignore


@asynccontextmanager
async def dedup_guard(redis: AsyncRedis, key: str, ttl: int):
    """基于时间窗口的去重守卫。

    设置一个带 TTL 的 key，整个 TTL 期间内后续调用会被拒绝。
    退出上下文时不会删除 key，由 Redis TTL 自动过期。

    适用于防止定时任务在短时间内被多次触发导致重复执行。

    :param:
        redis: Redis客户端实例
        key: 去重键名
        ttl: 去重窗口时间，单位秒
    :raises LockAcquireError: 当去重窗口内已有执行时抛出
    :yields: 首次调用成功后进入上下文
    """
    guard_key = f"dedup:{key}"
    acquired = bool(await redis.set(guard_key, "1", nx=True, ex=ttl))

    if not acquired:
        raise LockAcquireError(
            f"去重窗口内已有执行，跳过: {guard_key} (ttl={ttl}s)"
        )

    yield
