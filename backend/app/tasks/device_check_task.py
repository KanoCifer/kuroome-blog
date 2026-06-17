"""设备里程碑检查定时任务"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, date, datetime
from typing import Any

from app.api.des.db import get_async_session
from app.core.logger import logger
from app.models.models import DeviceTrack
from app.notification.context import context_from_config
from app.notification.payloads import DevicePayload
from app.notification.renderers import render_device_milestone
from app.plugins.notification import NotificationPlugin
from app.repositories.device_repo import DeviceRepo
from app.schemas.device import ReminderConfig


async def check_device_milestones() -> None:
    """检查设备里程碑并发送提醒"""

    logger.info("[DeviceCheck] Starting device milestone check")

    async with get_async_session() as session:
        repo = DeviceRepo(session)
        plugin = NotificationPlugin()

        devices: Sequence[DeviceTrack] = await repo.get_active_devices()
        today = datetime.now(UTC).date()

        for device in devices:
            reminder_config = _parse_reminder_config(device.reminder_config)
            if not reminder_config.enabled:
                continue

            await _check_milestone_reminder(
                plugin=plugin,
                device=device,
                reminder_config=reminder_config,
                today=today,
            )

    logger.info("[DeviceCheck] Device milestone check completed")


def _parse_reminder_config(config: dict | None) -> ReminderConfig:
    if isinstance(config, dict):
        return ReminderConfig(**config)
    return ReminderConfig()


async def _check_milestone_reminder(
    plugin: NotificationPlugin,
    device: DeviceTrack,
    reminder_config: ReminderConfig,
    today: date,
) -> None:
    purchase_date = device.purchase_date.date()
    days_owned = (today - purchase_date).days

    if days_owned in reminder_config.milestones:
        await _send_device_reminder(
            plugin=plugin,
            device=device,
            reminder_config=reminder_config,
            days=days_owned,
        )


async def _send_device_reminder(
    plugin: NotificationPlugin,
    device: DeviceTrack,
    reminder_config: ReminderConfig,
    days: int,
) -> None:
    # 计算周年文案
    years = days / 365
    if years >= 1:
        years_text = (
            f"{years:.0f}年" if years == int(years) else f"{years:.1f}年"
        )
        title = f"🎉 {device.name} {years_text}里程碑"
    else:
        title = f"🎉 {device.name} {days}天里程碑"

    body = f"您的 {device.name} 已陪伴您 {days} 天了！"

    payload = DevicePayload(
        title=title,
        body=body,
        name=device.name,
        price=device.price,
        currency=device.currency,
        purchase_date=device.purchase_date,
    )

    # 解析渠道配置 → NotificationContext
    config: dict[str, Any] = {}
    if reminder_config.feishu_webhook_url:
        config["feishu_webhook_url"] = reminder_config.feishu_webhook_url
    if reminder_config.email:
        config["email"] = reminder_config.email
    if reminder_config.bark_device_key:
        config["bark_device_key"] = reminder_config.bark_device_key

    ctx = await context_from_config(device.user_id, config)
    message = render_device_milestone(payload)

    try:
        results = await plugin.notify(
            channels=reminder_config.channels,
            message=message,
            ctx=ctx,
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
