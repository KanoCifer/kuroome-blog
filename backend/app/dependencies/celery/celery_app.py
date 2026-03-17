from __future__ import annotations

from celery import Celery

# 创建 Celery 应用
celery_app = Celery(
    "tasks",
    broker="redis://localhost:6379/0",  # 使用 Redis 作为消息代理
    backend="redis://localhost:6379/1",  # 使用 Redis 作为结果后端
)
