import httpx

from app.core.config import get_settings
from app.core.logger import logger

from . import (  # noqa: TID252
    DeviceNotificationPayload,
    NotificationPayload,
    NotifierBase,
)


class FeishuNotificationChannel(NotifierBase):
    """飞书通知渠道"""

    @property
    def channel(self) -> str:
        return "feishu"

    async def send(
        self, user_id: int, payload: NotificationPayload, config: dict
    ) -> bool:
        """发送飞书通知"""
        try:
            # 优先从 config 获取 Webhook URL，兜底用全局配置
            webhook_url = (
                config.get("feishu_webhook_url")
                or get_settings().FEISHU_WEBHOOK_URL
            )
            if not webhook_url:
                logger.warning("[Feishu] FEISHU_WEBHOOK_URL not configured")
                return False

            message = self._build_message(payload)
            feishu_payload = {
                "msg_type": "text",
                "content": {"text": message},
            }

            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0)
            ) as client:
                response = await client.post(
                    url=webhook_url, json=feishu_payload
                )
                response.raise_for_status()
                body = response.json()
                code = body.get("code", body.get("StatusCode"))
                if code not in (0, "0"):
                    logger.error(
                        f"[Feishu] API error: code={code} body={body}"
                    )
                    return False

            logger.info(
                f"[Feishu] Notification sent for subscription '{payload.subscription_name}'"
            )
            return True

        except Exception as e:
            logger.error(f"[Feishu] Failed to send notification: {e!r}")
            return False

    async def validate_config(self) -> bool:
        """飞书支持订阅级 Webhook，配置在 send 中校验"""
        return True

    def _build_message(self, payload: NotificationPayload) -> str:
        """构建飞书消息文本"""
        emoji = "🔔" if payload.days_until > 0 else "⚠️"
        days_text = (
            f"还有 {payload.days_until} 天"
            if payload.days_until > 0
            else "今天到期"
        )
        return f"""{emoji} 订阅续费提醒

📦 服务: {payload.subscription_name}
🏢 提供商: {payload.provider}
💰 金额: {payload.currency} {payload.price}
📅 续费日期: {payload.next_billing_date.strftime("%Y-%m-%d")}
⏰ 状态: {days_text}"""

    async def send_device_reminder(
        self, user_id: int, payload: DeviceNotificationPayload, config: dict
    ) -> bool:
        """发送设备周年提醒"""
        try:
            webhook_url = (
                config.get("feishu_webhook_url")
                or get_settings().FEISHU_WEBHOOK_URL
            )
            if not webhook_url:
                logger.warning("[Feishu] FEISHU_WEBHOOK_URL not configured")
                return False

            message = self._build_device_message(payload)
            feishu_payload = {
                "msg_type": "text",
                "content": {"text": message},
            }

            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0)
            ) as client:
                response = await client.post(
                    url=webhook_url, json=feishu_payload
                )
                response.raise_for_status()
                body = response.json()
                code = body.get("code", body.get("StatusCode"))
                if code not in (0, "0"):
                    logger.error(
                        f"[Feishu] API error: code={code} body={body}"
                    )
                    return False

            logger.info(
                f"[Feishu] Device reminder sent for device '{payload.name}'"
            )
            return True

        except Exception as e:
            logger.error(f"[Feishu] Failed to send device reminder: {e!r}")
            return False

    def _build_device_message(self, payload: DeviceNotificationPayload) -> str:
        """构建设备周年提醒飞书消息"""
        from datetime import UTC, datetime

        years = (datetime.now(UTC) - payload.purchase_date).days // 365
        return f"""🎉 设备周年提醒

📱 设备: {payload.name}
💰 价格: {payload.currency} {payload.price}
📅 购买日期: {payload.purchase_date.strftime("%Y-%m-%d")}
🎉 已使用 {years} 年啦！"""
