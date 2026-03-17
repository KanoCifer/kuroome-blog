from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker

from app.configs.logger import logger

result_backend = RedisAsyncResultBackend(
    redis_url="redis://localhost:6379/3",
    result_ex_time=86400,
)

broker: RedisStreamBroker = RedisStreamBroker(
    url="redis://localhost:6379/3",
).with_result_backend(result_backend=result_backend)

logger.info("[Taskiq] ✅ Broker initialized successfully")
