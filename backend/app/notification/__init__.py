from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class NotificationPayload:
    """通知载荷"""

    title: str
    body: str
    subscription_name: str
    provider: str
    price: float
    currency: str
    days_until: int
    next_billing_date: datetime


@dataclass
class DeviceNotificationPayload:
    """设备通知载荷"""

    title: str
    body: str
    name: str
    price: float
    currency: str
    purchase_date: datetime


class NotifierBase(ABC):
    """通知器基类"""

    @property
    @abstractmethod
    def channel(self) -> str:
        """通知渠道名称"""
        raise NotImplementedError("channel属性需要在子类中实现")

    @abstractmethod
    async def send(
        self, user_id: int, payload: NotificationPayload, config: dict
    ) -> bool:
        """发送通知，config 为订阅的 reminder_config JSON"""
        raise NotImplementedError("send_notification方法需要在子类中实现")

    @abstractmethod
    async def validate_config(self) -> bool:
        """验证通知配置"""
        raise NotImplementedError("validate_config方法需要在子类中实现")
