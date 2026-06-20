from __future__ import annotations

from datetime import UTC, datetime

from app.api.des.db import get_async_session
from app.models.log import Log
from app.plugins.task.task import broker


@broker.task
async def log_task(payload: dict) -> None:
    """将一条日志记录持久化到 PostgreSQL。

    payload 约定：
    - timestamp: float | None  epoch 秒，缺省时取当前时间
    - level: str               日志级别名
    - message: str             日志正文
    - extra: dict              其余上下文字段，整体写入 JSON 列
    """
    ts = payload.get("timestamp")
    timestamp = datetime.fromtimestamp(ts, tz=UTC) if ts else datetime.now(UTC)
    log = Log(
        timestamp=timestamp,
        level=payload["level"],
        message=payload["message"],
        extra=payload.get("extra") or {},
    )
    async with get_async_session() as session:
        session.add(log)
        # get_async_session 退出时统一 commit，这里无需手动提交
