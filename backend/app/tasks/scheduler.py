from taskiq import TaskiqScheduler
from taskiq.schedule_sources import LabelScheduleSource
from taskiq_redis import ListRedisScheduleSource

from app.configs.config import settings
from app.configs.logger import logger
from app.tasks.broker import broker

redis_source = ListRedisScheduleSource(settings.REDIS_URL)
scheduler = TaskiqScheduler(
    broker=broker,
    sources=[redis_source, LabelScheduleSource(broker)],
)

logger.info("[Taskiq] ✅ All scheduled tasks registered successfully")
