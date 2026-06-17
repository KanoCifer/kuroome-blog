"""领域通知载荷 —— 业务侧模型，不进 plugin 通用接口。

这些 payload 描述"订阅续费""设备周年"等具体业务对象，仅被
:mod:`app.notification.renderers` 消费并渲染成通用 :class:`Message`。
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SubscriptionPayload(BaseModel):
    """订阅续费提醒载荷。"""

    title: str
    body: str
    subscription_name: str
    provider: str
    price: float
    currency: str
    days_until: int
    next_billing_date: datetime


class DevicePayload(BaseModel):
    """设备周年提醒载荷。"""

    title: str
    body: str
    name: str
    price: float
    currency: str
    purchase_date: datetime


# 过渡期别名 —— 旧调用方仍可 ``from app.notification import NotificationPayload``
NotificationPayload = SubscriptionPayload
DeviceNotificationPayload = DevicePayload
