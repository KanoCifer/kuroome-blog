from taskiq import TaskiqScheduler
from taskiq_redis import ListRedisScheduleSource

from app.tasks.aps_tasks import refresh_rss_feeds, run_migration_job
from app.tasks.broker import broker

# Schedule source for persistent task scheduling
schedule_source = ListRedisScheduleSource(
    url="redis://localhost:6379/3",
    prefix="task_schedules",
    skip_past_schedules=False,  # Process missed schedules on startup
)

# Create scheduler instance
scheduler = TaskiqScheduler(
    broker=broker,
    sources=[schedule_source],
)

# Add scheduled tasks using task decorator schedules instead of add_task
# Run migration job every 10 minutes
run_migration_task = broker.task(
    schedule=[
        {
            "interval": 600,  # 10 minutes in seconds
            "schedule_id": "redis_to_db_migration",
        }
    ]
)(run_migration_job)

# Run RSS refresh every day at 10 AM
refresh_rss_task = broker.task(
    schedule=[
        {
            "cron": "0 10 * * *",  # Every day at 10:00 UTC
            "schedule_id": "rss_refresh",
        }
    ]
)(refresh_rss_feeds)
