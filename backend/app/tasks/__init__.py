"""Deprecation shim — 所有符号已迁移到 ``app.plugins.task``。"""

from app.plugins.task import broker, scheduler, send_code

__all__ = ["broker", "scheduler", "send_code"]
