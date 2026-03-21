from taskiq import TaskiqScheduler
from taskiq.schedule_sources import LabelScheduleSource
from taskiq_redis import ListRedisScheduleSource

from app.configs.logger import logger
from app.tasks.broker import broker

redis_source = ListRedisScheduleSource("redis://localhost:6379/0")
scheduler = TaskiqScheduler(
    broker=broker,
    sources=[redis_source, LabelScheduleSource(broker)],
)


logger.info("[Taskiq] ✅ All scheduled tasks registered successfully")
