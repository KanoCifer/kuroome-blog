"""Deprecation shim — 所有符号已迁移到 ``app.plugins.task``。

本模块保留仅用于向后兼容，新代码请直接从 ``app.plugins.task`` 导入。
"""

from app.plugins.task import TaskPlugin, send_code, scheduler
from app.plugins.task.tasks.email import save_cache_to_redis, save_to_mongo
from app.plugins.task.tasks.scheduled import (
    refresh_rss_feeds,
    run_migration_job,
    send_daily_summary,
    send_todo,
)
from app.plugins.task.tasks.subscription import subscription_check_task
from app.plugins.task.task import broker

__all__ = [
    "TaskPlugin",
    "broker",
    "refresh_rss_feeds",
    "run_migration_job",
    "save_cache_to_redis",
    "save_to_mongo",
    "scheduler",
    "send_code",
    "send_daily_summary",
    "send_todo",
    "subscription_check_task",
]
