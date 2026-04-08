from datetime import UTC, datetime

from taskiq import Context, TaskiqDepends

# 延迟导入避免循环依赖
from app.api.des.des import get_notification_service
from app.core.logger import logger
from app.notification import NotificationPayload
from app.tasks.broker import broker

# 提醒时间点映射: {天数: 配置key}
REMINDER_DAYS_MAP = {
    30: "days_30",
    7: "days_7",
    3: "days_3",
    1: "days_1",
    0: "day_of",
}

# Redis 去重集合 key
DEDUP_SET_KEY = "subscription:reminder:sent"


@broker.task(
    schedule=[
        {
            "interval": 3600 * 4,  # 每4小时执行一次
            "schedule_id": "subscription_check_task",
        }
    ]
)
async def subscription_check_task(ctx: Context = TaskiqDepends()):
    """定时检查订阅并发送续费提醒"""
    redis = getattr(ctx.state, "redis", None)
    if redis is None:
        logger.warning("[SubscriptionCheck] Redis not available, skip")
        return

    # 任务级别去重：4小时内不重复执行
    lock_key = "subscription_check_task:lock"
    locked = await redis.set(lock_key, "1", nx=True, ex=3600)
    if not locked:
        logger.info("[SubscriptionCheck] Another instance is running, skip")
        return

    try:
        async with get_notification_service() as notification_service:
            subscriptions = (
                await notification_service.get_all_active_subscriptions()
            )

            for sub in subscriptions:
                await _check_and_notify(redis, notification_service, sub)
    except Exception as e:
        logger.error(f"[SubscriptionCheck] Task failed: {e!r}")
    finally:
        await redis.delete(lock_key)


async def _check_and_notify(redis, notification_service, sub):
    """检查单个订阅是否需要发送提醒"""
    today = datetime.now(UTC).date()
    billing_date = sub.next_billing_date
    if hasattr(billing_date, "date"):
        billing_date = billing_date.date()

    days_until = (billing_date - today).days
    if days_until < 0:
        # 已过期，跳过（不发送负数天数的通知）
        return

    config = sub.reminder_config or {}
    channels = config.get("channels", [])

    for day_key, config_key in REMINDER_DAYS_MAP.items():
        if not config.get(config_key):
            continue
        if days_until != day_key:
            continue

        # Redis 集合去重：sub_id:reminder_type
        dedup_val = f"{sub.id}:{config_key}"
        is_sent = await redis.sismember(DEDUP_SET_KEY, dedup_val)
        if is_sent:
            logger.debug(f"[SubscriptionCheck] Already sent {dedup_val}, skip")
            continue

        # 构建通知内容
        payload = NotificationPayload(
            title=f"订阅续费提醒 - {sub.name}",
            body=f"{sub.provider} 订阅将在 {days_until} 天后续费",
            subscription_name=sub.name,
            provider=sub.provider,
            price=sub.price,
            currency=sub.currency,
            days_until=days_until,
            next_billing_date=sub.next_billing_date,
        )

        # 发送通知
        results = await notification_service.send_reminder(
            user_id=sub.user_id,
            payload=payload,
            config=config,
            channels=channels,
        )

        # 标记已发送
        if any(results.values()):
            await redis.sadd(DEDUP_SET_KEY, dedup_val)
            # 设置30天过期，防止集合无限增长
            await redis.expire(DEDUP_SET_KEY, 86400 * 30)
            logger.info(
                f"[SubscriptionCheck] Sent reminder for sub={sub.id} "
                f"type={config_key} results={results}"
            )
