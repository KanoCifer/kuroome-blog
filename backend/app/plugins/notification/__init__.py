"""通用通知插件 —— 传输层。

按 ``app/plugins`` 插件规范：本 ``__init__.py`` 仅重新导出公开 API，
实现见 :mod:`app.plugins.notification.notification`。

对外只暴露一个通用入口 :func:`notify` 与两个 Pydantic 模型
(:class:`Message` / :class:`NotificationContext`)，以及传输 adapter seam
:class:`NotificationChannel`。领域渲染（订阅模板 / 设备模板）不在此层，
留在业务侧 :mod:`app.notification.renderers`。
"""

from app.plugins.notification.notification import (
    Message,
    NotificationChannel,
    NotificationContext,
    NotificationPlugin,
    notify,
)

__all__ = [
    "Message",
    "NotificationChannel",
    "NotificationContext",
    "NotificationPlugin",
    "notify",
]
