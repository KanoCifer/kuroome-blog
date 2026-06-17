"""Deprecation shim — 所有符号已迁移到 ``app.plugins.task``。"""

from app.plugins.task import TaskPlugin, scheduler, send_code  # noqa: F401

__all__ = ["TaskPlugin", "scheduler", "send_code"]
