"""Taskiq scheduler — for CLI::

    taskiq scheduler app.plugins.task.scheduler:scheduler
"""

from taskiq import TaskiqScheduler
from taskiq.schedule_sources import LabelScheduleSource

from app.core.logger import logger
from app.plugins.task.task import broker

scheduler = TaskiqScheduler(
    broker=broker,
    sources=[LabelScheduleSource(broker)],
)

logger.bind(component="taskiq").info("all scheduled tasks registered successfully")
