"""通知传输 adapter 集合。

每个模块导出一个 :class:`NotificationChannel` 实现，仅负责"把
:class:`Message` 发到某端点"，不关心领域渲染。渲染由业务侧
:mod:`app.notification.renderers` 产出 :class:`Message`。
"""
