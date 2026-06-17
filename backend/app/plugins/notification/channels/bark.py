"""Bark iOS 推送渠道 —— 纯传输层，不查库、不渲染领域文本。"""

from __future__ import annotations

import httpx2

from app.core.logger import logger
from app.plugins.notification import Message, NotificationContext

_BASE_URL = "https://api.day.app"
_TIMEOUT = httpx2.Timeout(10.0)


class BarkChannel:
    """Bark 推送传输 adapter。

    device_key 仅来自 ``ctx.bark_device_key``（由调用方从
    reminder_config 或 Profile 解析后传入）。缺失时直接返回 False，
    不上查数据库。
    """

    name = "bark"

    async def send(self, message: Message, ctx: NotificationContext) -> bool:
        if not ctx.bark_device_key:
            logger.warning("[Bark] bark_device_key not provided")
            return False

        url = f"{_BASE_URL}/{ctx.bark_device_key}/{message.title}"
        payload = {
            "body": message.body,
            "level": "timeSensitive",
            "sound": "alarm",
        }
        try:
            async with httpx2.AsyncClient(timeout=_TIMEOUT) as client:
                response = await client.post(url=url, json=payload)
                response.raise_for_status()
                body = response.json()
                if body.get("code") != 200:
                    logger.error(f"[Bark] API error: {body}")
                    return False
            logger.info(f"[Bark] Notification sent: {message.title}")
            return True
        except Exception as e:
            logger.error(f"[Bark] Failed to send notification: {e!r}")
            return False
