from datetime import UTC, datetime

from taskiq import Context, TaskiqDepends

from app.core.logger import logger
from app.tasks.broker import broker
from app.utils.redis_lock import get_redis_lock


@broker.task(
    schedule=[
        {
            "interval": 1800,
            "schedule_id": "user_heartbeat_check",
        }
    ]
)
async def check_user_heartbeats(context: Context = TaskiqDepends()):
    """定期检查用户心跳，清理过期在线用户，更新在线统计."""
    redis = context.state.redis
    if not redis:
        logger.warning("Redis 未初始化，跳过心跳检查")
        return {"status": "skipped", "reason": "no redis"}

    try:
        from app.core.container import get_monitor_service

        async with get_redis_lock(
            redis=redis, key="heartbeat_check_lock", ttl=300
        ):
            async with get_monitor_service(redis=redis) as service:
                result = await service.cleanup_stale_heartbeats()

            logger.info(
                f"心跳检查完成：清理 {result['removed_count']} 个过期用户，"
                f"当前在线 {result['online_count']} 人"
            )
            return {
                "status": "ok",
                "removed_count": result["removed_count"],
                "online_count": result["online_count"],
                "ts": datetime.now(UTC).isoformat(),
            }

    except Exception as e:
        logger.exception(f"心跳检查任务失败: {e!s}")
        raise
