"""Taskiq broker factory + worker lifecycle + TaskPlugin wrapper.

The broker is a module-level singleton (required by @broker.task import-time
decoration).  TaskPlugin wraps its lifecycle for callers — no caller touches
the broker directly.
"""

from __future__ import annotations

from beanie import init_beanie
from pymongo import AsyncMongoClient
from redis.asyncio import ConnectionPool
from redis.asyncio import Redis as AsyncRedis
from taskiq import TaskiqEvents, TaskiqState
from taskiq.middlewares import SmartRetryMiddleware
from taskiq_aio_pika import AioPikaBroker
from taskiq_redis import RedisAsyncResultBackend

from app.core.config import get_settings
from app.core.logger import logger

# ---------------------------------------------------------------------------
# Module-level broker — must exist at import time for @broker.task decorators
# ---------------------------------------------------------------------------

_connection_pool = ConnectionPool.from_url(
    get_settings().REDIS_URL,
    decode_responses=True,
    max_connections=get_settings().REDIS_MAX_CONNECTIONS,
)

_result_backend = RedisAsyncResultBackend(
    redis_url=get_settings().REDIS_URL,
    result_ex_time=86400,
)

broker: AioPikaBroker = (
    AioPikaBroker(get_settings().RABBITMQ_URL)
    .with_result_backend(_result_backend)
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

logger.info("[Taskiq] ✅ Broker initialized")


# ---------------------------------------------------------------------------
# Worker lifecycle events
# ---------------------------------------------------------------------------


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def _on_worker_startup(state: TaskiqState) -> None:
    """Initialize Redis, MongoDB, and Beanie per worker process."""
    state.redis = AsyncRedis(connection_pool=_connection_pool)

    state.mongo_client = AsyncMongoClient(get_settings().MONGO_URI)
    mongo_db = state.mongo_client["readinglist"]

    from app.models.blog import Post
    from app.models.rss import RssArticle, RssFeed
    from app.models.subscription import SubscriptionLog

    await init_beanie(
        database=mongo_db,
        document_models=[
            Post,
            RssArticle,
            RssFeed,
            SubscriptionLog,
        ],
    )
    state.mongo = mongo_db


@broker.on_event(TaskiqEvents.WORKER_SHUTDOWN)
async def _on_worker_shutdown(state: TaskiqState) -> None:
    await state.redis.aclose()
    await state.mongo_client.close()


# ---------------------------------------------------------------------------
# Public lifecycle wrapper
# ---------------------------------------------------------------------------


class TaskPlugin:
    """Lifecycle manager for the Taskiq broker.

    Hide RabbitMQ URL, Redis result backend, SmartRetryMiddleware config,
    and worker event handlers behind a two-method interface.

    Usage in FastAPI lifespan::

        plugin = TaskPlugin()
        await plugin.startup()
        ...
        await plugin.shutdown()
    """

    def __init__(self, _broker: AioPikaBroker | None = None) -> None:
        self._broker = _broker or broker

    async def startup(self) -> None:
        await self._broker.startup()

    async def shutdown(self) -> None:
        await self._broker.shutdown()
