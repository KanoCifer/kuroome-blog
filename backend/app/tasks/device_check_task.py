"""设备里程碑检查定时任务"""

from collections.abc import Sequence
from datetime import UTC, date, datetime
from typing import Any

from app.api.des.db import get_async_session
from app.core.logger import logger
from app.models.models import DeviceTrack
from app.notification import DeviceNotificationPayload
from app.notification.dispatcher import NotificationDispatcher
from app.repositories.device_repo import DeviceRepo
from app.schemas.device import ReminderConfig


async def check_device_milestones() -> None:
    """检查设备里程碑并发送提醒

    检查所有设备是否达到用户自定义的里程碑天数，
    如果是则发送通知。
    """
    logger.info("[DeviceCheck] Starting device milestone check")

    async with get_async_session() as session:
        repo = DeviceRepo(session)
        dispatcher = NotificationDispatcher()

        # 获取所有活跃设备
        devices: Sequence[DeviceTrack] = await repo.get_active_devices()
        today = datetime.now(UTC).date()

        for device in devices:
            # 解析提醒配置
            reminder_config = _parse_reminder_config(device.reminder_config)

            # 如果未启用提醒，跳过
            if not reminder_config.enabled:
                continue

            # 检查里程碑
            _check_milestone_reminder(
                dispatcher=dispatcher,
                device=device,
                reminder_config=reminder_config,
                today=today,
            )

    logger.info("[DeviceCheck] Device milestone check completed")


def _parse_reminder_config(config: dict | None) -> ReminderConfig:
    """解析提醒配置"""
    if isinstance(config, dict):
        return ReminderConfig(**config)
    return ReminderConfig()


def _check_milestone_reminder(
    dispatcher: NotificationDispatcher,
    device: DeviceTrack,
    reminder_config: ReminderConfig,
    today: date,
) -> None:
    """检查里程碑提醒"""
    purchase_date = device.purchase_date.date()
    days_owned = (today - purchase_date).days

    # 检查是否达到用户设置的里程碑
    if days_owned in reminder_config.milestones:
        _send_device_reminder(
            dispatcher=dispatcher,
            device=device,
            reminder_config=reminder_config,
            days=days_owned,
        )


def _send_device_reminder(
    dispatcher: NotificationDispatcher,
    device: DeviceTrack,
    reminder_config: ReminderConfig,
    days: int,
) -> None:
    """发送设备里程碑提醒"""
    # 计算对应的年份（用于显示）
    years = days / 365
    if years >= 1:
        years_text = (
            f"{years:.0f}年" if years == int(years) else f"{years:.1f}年"
        )
        title = f"🎉 {device.name} {years_text}里程碑"
    else:
        title = f"🎉 {device.name} {days}天里程碑"

    body = f"您的 {device.name} 已陪伴您 {days} 天了！"

    # 构建通知 payload
    payload = DeviceNotificationPayload(
        title=title,
        body=body,
        name=device.name,
        price=device.price,
        currency=device.currency,
        purchase_date=device.purchase_date,
    )

    # 构建渠道配置（包含用户可能指定的渠道参数）
    config: dict[str, Any] = {}
    if reminder_config.feishu_webhook_url:
        config["feishu_webhook_url"] = reminder_config.feishu_webhook_url
    if reminder_config.email:
        config["email"] = reminder_config.email
    if reminder_config.bark_device_key:
        config["bark_device_key"] = reminder_config.bark_device_key

    try:
        results = dispatcher.dispatch_device_reminder(
            payload=payload,
            reminder_config=config,
            user_id=device.user_id,
            channels=reminder_config.channels,
        )
        logger.info(
            f"[DeviceCheck] Milestone notification sent for device "
            f"'{device.name}' ({days} days): {results}"
        )
    except Exception as e:
        logger.error(
            f"[DeviceCheck] Failed to send notification for device "
            f"'{device.name}': {e!r}"
        )
