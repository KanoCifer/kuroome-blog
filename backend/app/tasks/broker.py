from taskiq.middlewares import SmartRetryMiddleware
from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker

from app.configs.logger import logger

result_backend = RedisAsyncResultBackend(
    redis_url="redis://localhost:6379/3",
    result_ex_time=86400,
)

broker: RedisStreamBroker = (
    RedisStreamBroker(
        url="redis://localhost:6379/3",
    )
    .with_result_backend(result_backend=result_backend)
    .with_middlewares(
        SmartRetryMiddleware(
            default_retry_count=5,
            default_delay=10,
            use_jitter=True,
            use_delay_exponent=True,
            max_delay_exponent=120,
        )
    )
)

logger.info("[Taskiq]✅Broker初始化成功")
