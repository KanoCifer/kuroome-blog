"""领域渲染层 —— 把领域 payload 渲染成通用 :class:`Message` 的纯函数。

纯函数：只依据入参返回 :class:`Message`，无副作用，可独立单测。
传输层（:mod:`app.plugins.notification.channels`）只认 Message 通用文本，
不再嵌入领域字段与 HTML 模板。
"""

from __future__ import annotations

from datetime import UTC, datetime
from html import escape

from app.notification.payloads import DevicePayload, SubscriptionPayload
from app.plugins.notification import Message


def _ensure_aware(dt: datetime) -> datetime:
    """PGSQL DateTime 不带时区；渲染时假定 UTC。"""
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


def render_subscription_reminder(payload: SubscriptionPayload) -> Message:
    """订阅续费提醒 → Message（纯文本 body + HTML）。"""
    days_text = (
        f"还有 {payload.days_until} 天"
        if payload.days_until > 0
        else "今天到期"
    )
    body = (
        f"📦 {payload.subscription_name}\n"
        f"🏢 {payload.provider}\n"
        f"💰 {payload.currency} {payload.price}\n"
        f"📅 {payload.next_billing_date.strftime('%Y-%m-%d')}\n"
        f"⏰ {days_text}"
    )
    return Message(
        title=payload.title,
        body=body,
        html=_render_subscription_html(payload, days_text),
    )


def render_device_milestone(payload: DevicePayload) -> Message:
    """设备周年提醒 → Message（纯文本 body + HTML）。"""
    purchase_date = _ensure_aware(payload.purchase_date)
    years = (datetime.now(UTC) - purchase_date).days // 365
    body = (
        f"📱 {payload.name}\n"
        f"💰 {payload.currency} {payload.price}\n"
        f"📅 购买于 {payload.purchase_date.strftime('%Y-%m-%d')}\n"
        f"🎉 已使用 {years} 年"
    )
    return Message(
        title=payload.title,
        body=body,
        html=_render_device_html(payload, years),
    )


def _render_subscription_html(
    payload: SubscriptionPayload, days_text: str
) -> str:
    """构建订阅续费提醒邮件 HTML（迁移自原 email_channel._build_html）。"""
    subscription_name = escape(payload.subscription_name)
    provider = escape(payload.provider)
    price = f"{payload.price:,.2f}"
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


def _render_device_html(payload: DevicePayload, years: int) -> str:
    """构建设备周年提醒邮件 HTML（迁移自原 email_channel._build_device_html）。"""
    device_name = escape(payload.name)
    price = f"{payload.price:,.2f}"
    days = (datetime.now(UTC).date() - payload.purchase_date.date()).days
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
                        您的设备已陪伴您 {days} 天了！
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
