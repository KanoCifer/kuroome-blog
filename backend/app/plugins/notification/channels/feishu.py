"""飞书 Webhook 渠道 —— 仅负责传输（text 消息），不渲染领域文本。

富文本（``post``）消息属业务关注点，由调用方在 task 层处理；
本渠道只发 ``msg_type=text`` 的通用文本。
"""

from __future__ import annotations

import httpx2

from app.core.config import get_settings
from app.core.logger import logger
from app.plugins.notification import Message, NotificationContext

_TIMEOUT = httpx2.Timeout(10.0)


class FeishuChannel:
    """飞书 Webhook 传输 adapter。

    webhook_url 来源（保持重构前兼容优先级）：
    1. ``ctx.feishu_webhook_url``（订阅级 reminder_config）；
    2. 全局 settings.FEISHU_WEBHOOK_URL。
    """

    name = "feishu"

    async def send(self, message: Message, ctx: NotificationContext) -> bool:
        webhook_url = (
            ctx.feishu_webhook_url or get_settings().FEISHU_WEBHOOK_URL
        )
        if not webhook_url:
            logger.warning("[Feishu] FEISHU_WEBHOOK_URL not configured")
            return False

        payload = {
            "msg_type": "text",
            "content": {"text": f"{message.title}\n\n{message.body}"},
        }
        try:
            async with httpx2.AsyncClient(timeout=_TIMEOUT) as client:
                response = await client.post(url=webhook_url, json=payload)
                response.raise_for_status()
                body = response.json()
                code = body.get("code", body.get("StatusCode"))
                if code not in (0, "0"):
                    logger.error(
                        f"[Feishu] API error: code={code} body={body}"
                    )
                    return False
            logger.info(f"[Feishu] Notification sent: {message.title}")
            return True
        except Exception as e:
            logger.error(f"[Feishu] Failed to send notification: {e!r}")
            return False
