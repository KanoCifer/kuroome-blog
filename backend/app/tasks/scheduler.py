from taskiq import TaskiqScheduler
from taskiq_redis import ListRedisScheduleSource

from app.configs.logger import logger
from app.tasks.aps_tasks import refresh_rss_feeds, run_migration_job
from app.tasks.broker import broker

logger.info("[Taskiq] 🔧 Initializing scheduler...")

# Schedule source for persistent task scheduling (Redis)
redis_schedule_source = ListRedisScheduleSource(
    url="redis://localhost:6379/3",
)

scheduler = TaskiqScheduler(
    broker=broker,
    sources=[redis_schedule_source],
)
run_migration_task = broker.task(
    schedule=[
        {
            "interval": 600,  # 每10分钟执行一次
            "schedule_id": "redis_to_db_migration",
        }
    ]
)(run_migration_job)

refresh_rss_task = broker.task(
    schedule=[
        {
            "cron": "0 10 * * *",
            "schedule_id": "rss_refresh",
        }
    ]
)(refresh_rss_feeds)


logger.info("[Taskiq] ✅ All scheduled tasks registered successfully")
