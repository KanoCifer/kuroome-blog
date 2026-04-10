from datetime import UTC, datetime
from html import escape

from fastapi_mail import FastMail, MessageSchema, MessageType
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.des.db import get_async_session
from app.core.config import get_settings
from app.core.logger import logger
from app.core.mail import MailConfig
from app.models.models import User

from . import (  # noqa: TID252
    DeviceNotificationPayload,
    NotificationPayload,
    NotifierBase,
)


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
        subscription_name = escape(payload.subscription_name)
        provider = escape(payload.provider)
        price = f"{payload.price:,.2f}"
        days_text = (
            f"还有 {payload.days_until} 天"
            if payload.days_until > 0
            else "今天到期"
        )
        status_bg = "#E8F8EF" if payload.days_until > 0 else "#FDECEE"
        status_color = "#157347" if payload.days_until > 0 else "#B42318"

        return f"""
        <div style="margin:0;padding:24px 0;background:#F5F7FB;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
                  style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;
                  box-shadow:0 8px 24px rgba(15,23,42,0.08);font-family:'Segoe UI','PingFang SC',
                  'Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#111827;">
                  <tr>
                    <td style="padding:24px 28px;background:linear-gradient(120deg,#0F766E,#155EEF);">
                      <p style="margin:0;font-size:12px;line-height:18px;color:#D1FAE5;letter-spacing:0.8px;">
                        SUBSCRIPTION ALERT
                      </p>
                      <h1 style="margin:8px 0 0;font-size:22px;line-height:30px;color:#FFFFFF;">
                        订阅续费提醒
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 28px;">
                      <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#4B5563;">
                        您的订阅即将续费，请留意扣款时间与金额。
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
                        <tr>
                          <td style="padding:12px 16px;font-size:14px;color:#6B7280;border-bottom:1px solid #F3F4F6;">
                            订阅名称
                          </td>
                          <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #F3F4F6;">
                            {subscription_name}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;font-size:14px;color:#6B7280;border-bottom:1px solid #F3F4F6;">
                            服务商
                          </td>
                          <td style="padding:12px 16px;font-size:14px;color:#111827;border-bottom:1px solid #F3F4F6;">
                            {provider}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;font-size:14px;color:#6B7280;border-bottom:1px solid #F3F4F6;">
                            续费金额
                          </td>
                          <td style="padding:12px 16px;font-size:14px;color:#111827;border-bottom:1px solid #F3F4F6;">
                            {payload.currency} {price}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;font-size:14px;color:#6B7280;border-bottom:1px solid #F3F4F6;">
                            续费日期
                          </td>
                          <td style="padding:12px 16px;font-size:14px;color:#111827;border-bottom:1px solid #F3F4F6;">
                            {payload.next_billing_date.strftime("%Y-%m-%d")}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;font-size:14px;color:#6B7280;">
                            到期状态
                          </td>
                          <td style="padding:12px 16px;">
                            <span style="display:inline-block;padding:4px 10px;border-radius:999px;
                              background:{status_bg};color:{status_color};font-size:13px;font-weight:600;">
                              {days_text}
                            </span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#9CA3AF;">
                        此邮件由 kanocifer.chat 自动发送，请勿直接回复。
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        """

    async def send_device_reminder(
        self, user_id: int, payload: DeviceNotificationPayload, config: dict
    ) -> bool:
        """发送设备周年提醒邮件"""
        try:
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

            html_body = self._build_device_html(payload)
            message = MessageSchema(
                subject=f"设备周年提醒: {payload.name}",
                recipients=[email_address],  # type: ignore
                body=html_body,
                subtype=MessageType.html,
            )

            fm = FastMail(MailConfig.conf)
            await fm.send_message(message)
            logger.info(
                f"[Email] Device reminder sent to {email_address} "
                f"for device '{payload.name}'"
            )
            return True

        except Exception as e:
            logger.error(f"[Email] Failed to send device reminder: {e!r}")
            return False

    def _build_device_html(self, payload: DeviceNotificationPayload) -> str:
        """构建设备周年提醒邮件 HTML 内容"""
        device_name = escape(payload.name)
        price = f"{payload.price:,.2f}"
        years = (datetime.now(UTC) - payload.purchase_date).days // 365
        anniversary_text = f"{years}周年"

        return f"""
        <div style="margin:0;padding:24px 0;background:#F5F7FB;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
                  style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;
                  box-shadow:0 8px 24px rgba(15,23,42,0.08);font-family:'Segoe UI','PingFang SC',
                  'Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#111827;">
                  <tr>
                    <td style="padding:24px 28px;background:linear-gradient(120deg,#F59E0B,#EF4444);">
                      <p style="margin:0;font-size:12px;line-height:18px;color:#FEF3C7;letter-spacing:0.8px;">
                        DEVICE ALERT
                      </p>
                      <h1 style="margin:8px 0 0;font-size:22px;line-height:30px;color:#FFFFFF;">
                        设备{anniversary_text}提醒
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 28px;">
                      <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#4B5563;">
                        您的设备已陪伴您 {years} 年了！
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
                        <tr>
                          <td style="padding:12px 16px;font-size:14px;color:#6B7280;border-bottom:1px solid #F3F4F6;">
                            设备名称
                          </td>
                          <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #F3F4F6;">
                            {device_name}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;font-size:14px;color:#6B7280;border-bottom:1px solid #F3F4F6;">
                            购买价格
                          </td>
                          <td style="padding:12px 16px;font-size:14px;color:#111827;border-bottom:1px solid #F3F4F6;">
                            {payload.currency} {price}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 16px;font-size:14px;color:#6B7280;">
                            购买日期
                          </td>
                          <td style="padding:12px 16px;font-size:14px;color:#111827;">
                            {payload.purchase_date.strftime("%Y-%m-%d")}
                          </td>
                        </tr>
                      </table>
                      <p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#9CA3AF;">
                        此邮件由 kanocifer.chat 自动发送，请勿直接回复。
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        """
