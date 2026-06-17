"""邮件渠道 —— 纯传输层，不查库、不渲染领域 HTML。

HTML 由业务侧 renderer 产出并放入 ``Message.html``；为空时退化为
转义后纯文本 body。
"""

from __future__ import annotations

from html import escape

from fastapi_mail import FastMail, MessageSchema, MessageType

from app.core.config import get_settings
from app.core.logger import logger
from app.core.mail import MailConfig
from app.plugins.notification import Message, NotificationContext


class EmailChannel:
    """邮件传输 adapter。

    收件邮箱仅来自 ``ctx.email``（由调用方从 reminder_config 或 Profile
    解析后传入）。缺失时直接返回 False，不上查数据库。

    全局 SMTP 配置（MAIL_USERNAME / MAIL_PASSWORD）缺失时同样返回 False。
    """

    name = "email"

    async def send(self, message: Message, ctx: NotificationContext) -> bool:
        settings = get_settings()
        if not (settings.MAIL_USERNAME and settings.MAIL_PASSWORD):
            logger.warning("[Email] Mail server not configured")
            return False

        if not ctx.email:
            logger.warning("[Email] email address not provided")
            return False

        html_body = message.html or f"<pre>{escape(message.body)}</pre>"
        schema = MessageSchema(
            subject=message.title,
            recipients=[ctx.email],  # type: ignore
            body=html_body,
            subtype=MessageType.html,
        )
        try:
            fm = FastMail(MailConfig.conf)
            await fm.send_message(schema)
            logger.info(
                f"[Email] Notification sent to {ctx.email}: {message.title}"
            )
            return True
        except Exception as e:
            logger.error(f"[Email] Failed to send notification: {e!r}")
            return False
