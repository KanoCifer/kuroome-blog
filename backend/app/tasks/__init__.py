from app.tasks.broker import broker
from app.tasks.task import send_feishu_message

__all__ = [
    "broker",
    "send_feishu_message",
]


"""
后台任务模块 - Taskiq 异步任务调度系统

本模块基于 Taskiq + RabbitMQ (AioPika) 构建，提供异步任务执行和定时调度功能。

架构组件:
-----------
    broker: Taskiq 任务代理，基于 RabbitMQ 消息队列
    scheduler: 任务调度器，使用 Redis 存储调度配置

异步任务 (按需触发):
-------------------
    # send_bootstrap_emails(admin_email)  - [已禁用] 应用启动时发送引导邮件给管理员
    send_code(email, verification_code) - 发送用户注册验证码邮件
    send_feishu_message(message)        - 发送飞书 Webhook 通知消息
    save_to_mongo(feed_url, entries, user_id) - 将 RSS 文章保存到 MongoDB
    save_cache_to_redis(key, value, expire)   - 缓存数据到 Redis

定时任务 (自动调度):
-------------------
    run_migration_job   - 每 30 分钟迁移 Redis 访客数据到 PostgreSQL
    refresh_rss_feeds   - 每天 10:00 (Asia/Shanghai) 刷新所有 RSS 订阅源

依赖服务:
---------
    - RabbitMQ: 消息队列 (amqp://guest:guest@localhost:5672/)
    - Redis: 结果存储 + 调度源 (localhost:6379)
    - MongoDB: RSS 文章存储
    - PostgreSQL: 关系数据存储

邮件发送位置汇总:
-----------------
    app/tasks/task.py:
        # send_bootstrap_emails(admin_email)  - [已禁用] 应用启动时发送引导邮件 (HTML格式)
        send_code(email, verification_code) - 用户注册时发送验证码邮件

    app/utils/mailservice.py:
        # send_bootstrap_emails(admin_email)  - [已禁用] 备用实现 (未被核心流程使用)

    调用入口:
        app/routers/auth.py:450  - 调用 send_code.kiq() 发送验证码
        # app/main.py:88       - [已禁用] 启动时调用 send_bootstrap_emails.kiq()

飞书消息位置汇总:
-----------------
    app/tasks/task.py:
        send_feishu_message(message) - 通用飞书消息发送
            模板: "KUROOME BLOG API 已成功启动！时间：{now}" 或自定义消息

    app/tasks/aps_tasks.py:
        refresh_rss_feeds() - 每天 10:00 定时执行
            模板: "RSS 刷新完成！总源: X, 成功: Y, 新增: Z"
        send_todo() - 每天 09:00 定时执行
            模板: "您有 X 个待办未完成" + 事项列表

    app/main.py:
        send_feishu_message.kiq() - 应用启动时发送默认启动消息

    app/routers/admin.py:
        send_feishu_message.kiq("API服务正在部署中，请稍候...")
            - Gitee 部署 Webhook 触发

    app/utils/mailservice.py:
        send_feishu_message() - 备用实现 (未被核心流程使用)

    test/test_feishu.py:
        send_feishu_message("测试飞书消息发送（pytest）")
            - pytest 测试直接调用

    配置:
        所有飞书消息读取 FEISHU_WEBHOOK_URL 环境变量
        设为空字符串可禁用所有飞书通知
"""

from app.tasks.aps_tasks import refresh_rss_feeds, run_migration_job
from app.tasks.maintain_task import check_user_heartbeats
from app.tasks.scheduler import scheduler
from app.tasks.task import (
    save_cache_to_redis,
    save_to_mongo,
    send_code,
)
from app.tasks.weread_task import import_books_from_weread

__all__ = [
    "broker",
    "check_user_heartbeats",
    "import_books_from_weread",
    "refresh_rss_feeds",
    "run_migration_job",
    "save_cache_to_redis",
    "save_to_mongo",
    "scheduler",
    "send_code",
    "send_feishu_message",
]
