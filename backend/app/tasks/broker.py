from taskiq.middlewares import SmartRetryMiddleware
from taskiq_aio_pika import AioPikaBroker
from taskiq_redis import RedisAsyncResultBackend

from app.configs.logger import logger

result_backend = RedisAsyncResultBackend(
    redis_url="redis://localhost:6379/3",
    result_ex_time=86400,
)
broker: AioPikaBroker = (
    AioPikaBroker(
        "amqp://guest:guest@localhost:5672/",
    )
    .with_result_backend(
        RedisAsyncResultBackend(
            "redis://localhost:6379/3", result_ex_time=86400
        )
    )
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
