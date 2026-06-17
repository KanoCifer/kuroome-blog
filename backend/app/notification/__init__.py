"""通知业务层 —— 领域渲染 + context 构造 + payload 定义。

传输层见 :mod:`app.plugins.notification`（纯通用，无业务依赖）。

本模块保留旧导入路径兼容：
- ``NotificationPayload`` → :class:`app.notification.payloads.SubscriptionPayload`
- ``DeviceNotificationPayload`` → :class:`app.notification.payloads.DevicePayload`
"""

from app.notification.payloads import (
    DeviceNotificationPayload,
    DevicePayload,
    NotificationPayload,
    SubscriptionPayload,
)

__all__ = [
    "DeviceNotificationPayload",
    "DevicePayload",
    "NotificationPayload",
    "SubscriptionPayload",
]
