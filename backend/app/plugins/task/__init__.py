"""后台任务插件 —— Taskiq 异步任务调度。

对外暴露 3 个符号：

- :class:`TaskPlugin` — broker 生命周期管理（startup / shutdown）
- :func:`send_code` — 注册验证码邮件（``.kiq()`` 入队）
- ``scheduler`` — TaskiqScheduler 实例（CLI: ``taskiq scheduler app.plugins.task.scheduler:scheduler``）

通知发送（原 send_feishu_message）已迁移到 :mod:`app.plugins.notification`：
在 task 代码中直接调用 ``notify(channels=["feishu"], ...)``。

定时任务（run_migration_job / refresh_rss_feeds / send_daily_summary /
send_todo / subscription_check_task）通过 @broker.task 装饰器自动注册，
不在此层暴露。
"""

from app.plugins.task.scheduler import scheduler
from app.plugins.task.task import TaskPlugin
from app.plugins.task.tasks.email import send_code

# Trigger @broker.task registration for scheduled tasks (not in public API)
from app.plugins.task.tasks import scheduled, subscription  # noqa: F401

__all__ = [
    "TaskPlugin",
    "scheduler",
    "send_code",
]
