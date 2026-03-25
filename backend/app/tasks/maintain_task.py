from datetime import UTC, datetime

from redis.asyncio import Redis as AsyncRedis
from taskiq import Context, TaskiqDepends

from app.configs.logger import logger
from app.dependencies.database import AsyncSessionFactory
from app.models.models import User
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
    redis: AsyncRedis = context.state.redis
    if not redis:
        logger.warning("Redis 未初始化，跳过心跳检查")
        return {"status": "skipped", "reason": "no redis"}

    try:
        async with get_redis_lock(
            redis=redis, key="heartbeat_check_lock", ttl=300
        ):
            now = int(datetime.now(UTC).timestamp())
            cutoff_time = now - 600

            removed_count = await redis.zremrangebyscore(
                "online_users_z", 0, cutoff_time
            )
            online_count = await redis.zcard("online_users_z")

            await redis.set("stats:online_count", str(online_count), ex=120)

            online_user_ids = await redis.zrange("online_users_z", 0, -1)
            online_user_ids = [int(uid.decode()) for uid in online_user_ids]

            if online_user_ids:
                async with AsyncSessionFactory() as session:
                    from sqlalchemy import update

                    await session.execute(
                        update(User)
                        .where(User.id.in_(online_user_ids))
                        .values(active=True)
                        .execution_options(synchronize_session=False)
                    )

                    await session.execute(
                        update(User)
                        .where(
                            User.id.not_in(online_user_ids),
                            User.active,
                        )
                        .values(active=False)
                        .execution_options(synchronize_session=False)
                    )

                    # 批量更新离线用户状态
                    await session.execute(
                        update(User)
                        .where(
                            User.id.not_in(online_user_ids),
                            User.active,
                        )
                        .values(active=False)
                        .execution_options(synchronize_session=False)
                    )

                    await session.commit()

            logger.info(
                f"心跳检查完成：清理 {removed_count} 个过期用户，当前在线 {online_count} 人"
            )
            return {
                "status": "ok",
                "removed_count": removed_count,
                "online_count": online_count,
                "ts": datetime.now(UTC).isoformat(),
            }

    except Exception as e:
        logger.exception(f"心跳检查任务失败: {e!s}")
        raise
