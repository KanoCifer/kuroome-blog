from redis.asyncio import Redis as AsyncRedis


# ----------------------
# 1. 异步 Redis 配置
# ----------------------
async def get_async_redis():
    # 创建异步 Redis 客户端
    redis: AsyncRedis = AsyncRedis(
        host="localhost",
        port=6379,
        db=2,
        decode_responses=True,
        max_connections=10,
    )
    try:
        yield redis
    finally:
        # 异步关闭连接（归还到连接池）
        await redis.close()
