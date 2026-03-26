from taskiq import TaskiqScheduler
from taskiq.schedule_sources import LabelScheduleSource

from app.core.logger import logger
from app.tasks.broker import broker

scheduler = TaskiqScheduler(
    broker=broker,
    sources=[LabelScheduleSource(broker)],
)

logger.info("[Taskiq] ✅ All scheduled tasks registered successfully")
