from fastapi_mail import FastMail, MessageSchema, MessageType
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.des.db import get_async_session
from app.core.config import get_settings
from app.core.logger import logger
from app.core.mail import MailConfig
from app.models.models import User

from . import NotificationPayload, NotifierBase  # noqa: TID252


class EmailNotificationChannel(NotifierBase):
    """邮件通知渠道"""

    @property
    def channel(self) -> str:
        return "email"

    async def send(
        self, user_id: int, payload: NotificationPayload, config: dict
    ) -> bool:
        """发送邮件通知"""
        try:
            # 优先从 config 获取邮箱，兜底查 Profile
            email_address = config.get("email") or await self._get_user_email(
                user_id
            )
            if not email_address:
                logger.warning(
                    f"[Email] User {user_id} has no email configured"
                )
                return False

            if not await self.validate_config():
                logger.warning("[Email] Mail server not configured")
                return False

            html_body = self._build_html(payload)
            message = MessageSchema(
                subject=f"订阅续费提醒: {payload.subscription_name}",
                recipients=[email_address],  # type: ignore
                body=html_body,
                subtype=MessageType.html,
            )

            fm = FastMail(MailConfig.conf)
            await fm.send_message(message)
            logger.info(
                f"[Email] Notification sent to {email_address} "
                f"for subscription '{payload.subscription_name}'"
            )
            return True

        except Exception as e:
            logger.error(f"[Email] Failed to send notification: {e!r}")
            return False

    async def validate_config(self) -> bool:
        """验证邮件通知配置是否有效"""
        settings = get_settings()
        return bool(settings.MAIL_USERNAME and settings.MAIL_PASSWORD)

    async def _get_user_email(self, user_id: int) -> str | None:
        """获取用户邮箱"""
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
            return user.profile.email

    def _build_html(self, payload: NotificationPayload) -> str:
        """构建邮件 HTML 内容"""
        days_text = (
            f"还有 {payload.days_until} 天"
            if payload.days_until > 0
            else "今天"
        )
        return f"""
        <h1>订阅续费提醒</h1>
        <p>您的订阅 <strong>{payload.subscription_name}</strong> 即将续费。</p>
        <ul>
            <li>服务商: {payload.provider}</li>
            <li>金额: {payload.currency} {payload.price}</li>
            <li>续费日期: {payload.next_billing_date.strftime("%Y-%m-%d")}</li>
            <li>状态: {days_text}</li>
        </ul>
        <p style="color: #666; font-size: 12px;">
            此邮件由 kanocifer.chat 自动发送，请勿回复。
        </p>
        """
