import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.des.db import get_async_session
from app.core.logger import logger
from app.models.models import User

from . import (  # noqa: TID252
    DeviceNotificationPayload,
    NotificationPayload,
    NotifierBase,
)


class BarkNotificationChannel(NotifierBase):
    """Bark iOS 推送通知渠道"""

    BASE_URL = "https://api.day.app"

    @property
    def channel(self) -> str:
        return "bark"

    async def send(
        self, user_id: int, payload: NotificationPayload, config: dict
    ) -> bool:
        """发送 Bark 通知"""
        try:
            # 优先从 config 获取 device_key，兜底查 Profile
            device_key = config.get(
                "bark_device_key"
            ) or await self._get_user_device_key(user_id)
            if not device_key:
                logger.warning(
                    f"[Bark] User {user_id} has no device key configured"
                )
                return False

            url = f"{self.BASE_URL}/{device_key}/{payload.title}"
            bark_body = {
                "body": self._build_body(payload),
                "level": "timeSensitive",
                "sound": "alarm",
            }

            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0)
            ) as client:
                response = await client.post(url=url, json=bark_body)
                response.raise_for_status()
                body = response.json()
                if body.get("code") != 200:
                    logger.error(f"[Bark] API error: {body}")
                    return False

            logger.info(
                f"[Bark] Notification sent for subscription '{payload.subscription_name}'"
            )
            return True

        except Exception as e:
            logger.error(f"[Bark] Failed to send notification: {e!r}")
            return False

    async def validate_config(self) -> bool:
        """Bark 无全局配置，依赖用户个人设置，总是为 True"""
        return True

    async def _get_user_device_key(self, user_id: int) -> str | None:
        """获取用户的 Bark Device Key"""
        async with get_async_session() as session:
            stmt = (
                select(User)
                .where(User.id == user_id)
                .options(selectinload(User.profile))
            )
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            if not user or not user.profile:
                return None
            return getattr(user.profile, "bark_device_key", None)

    def _build_body(self, payload: NotificationPayload) -> str:
        """构建 Bark 通知内容"""
        days_text = (
            f"还有 {payload.days_until} 天"
            if payload.days_until > 0
            else "今天到期"
        )
        return (
            f"📦 {payload.subscription_name}\n"
            f"🏢 {payload.provider}\n"
            f"💰 {payload.currency} {payload.price}\n"
            f"📅 {payload.next_billing_date.strftime('%Y-%m-%d')}\n"
            f"⏰ {days_text}"
        )

    async def send_device_reminder(
        self, user_id: int, payload: DeviceNotificationPayload, config: dict
    ) -> bool:
        """发送设备周年提醒"""
        try:
            device_key = config.get(
                "bark_device_key"
            ) or await self._get_user_device_key(user_id)
            if not device_key:
                logger.warning(
                    f"[Bark] User {user_id} has no device key configured"
                )
                return False

            url = f"{self.BASE_URL}/{device_key}/{payload.title}"
            bark_body = {
                "body": self._build_device_body(payload),
                "level": "timeSensitive",
                "sound": "alarm",
            }

            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0)
            ) as client:
                response = await client.post(url=url, json=bark_body)
                response.raise_for_status()
                body = response.json()
                if body.get("code") != 200:
                    logger.error(f"[Bark] API error: {body}")
                    return False

            logger.info(
                f"[Bark] Device reminder sent for device '{payload.name}'"
            )
            return True

        except Exception as e:
            logger.error(f"[Bark] Failed to send device reminder: {e!r}")
            return False

    def _build_device_body(self, payload: DeviceNotificationPayload) -> str:
        """构建设备周年提醒内容"""
        from datetime import UTC, datetime

        years = (datetime.now(UTC) - payload.purchase_date).days // 365
        return (
            f"📱 {payload.name}\n"
            f"💰 {payload.currency} {payload.price}\n"
            f"📅 购买于 {payload.purchase_date.strftime('%Y-%m-%d')}\n"
            f"🎉 已使用 {years} 年"
        )
