from taskiq.middlewares import SmartRetryMiddleware
from taskiq_aio_pika import AioPikaBroker
from taskiq_redis import RedisAsyncResultBackend

from app.core import get_settings, logger

result_backend = RedisAsyncResultBackend(
    redis_url=get_settings().REDIS_URL,
    result_ex_time=86400,
)
broker: AioPikaBroker = (
    AioPikaBroker(
        get_settings().RABBITMQ_URL,
    )
    .with_result_backend(
        RedisAsyncResultBackend(get_settings().REDIS_URL, result_ex_time=86400)
    )
    .with_middlewares(
        SmartRetryMiddleware(
            default_retry_count=3,
            default_delay=2,
            use_jitter=True,
            use_delay_exponent=True,
            max_delay_exponent=6,
        )
    )
)

logger.info("[Taskiq]✅Broker初始化成功")
