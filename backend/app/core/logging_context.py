"""trace_id 上下文：跨 HTTP 请求与 Taskiq 任务串联日志链路的唯一标识。

- FastAPI middleware 在请求入口生成并 ``set`` 一个 trace_id（见
  ``app/middleware.py``），响应头回写 ``X-Trace-Id``。
- Taskiq middleware 在 ``pre_execute`` 为每次任务执行生成新的 trace_id
  （见 ``app/plugins/task/middlewares.py``）。
- ``app/core/logger.py`` 的 ``_add_trace_id`` 处理器把当前 contextvar
  注入每条 structlog event_dict 的 ``trace_id`` 键，``JSONRenderer`` 原样
  输出，终端可见、DB 持久化时进入 JSON 列。

排查时 ``grep <trace_id>`` 即可串起一次 HTTP→service→repo→redis→db 的全链路，
取代按模块分文件对时间戳的做法。规约见 ``docs/rules/logging.md``。
"""

from __future__ import annotations

import contextvars
import secrets

trace_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "trace_id", default="-"
)


def new_trace_id() -> str:
    """生成 8 位十六进制 trace_id。"""
    return secrets.token_hex(4)


def set_trace_id(trace_id: str | None = None) -> contextvars.Token[str]:
    """设置当前上下文的 trace_id，返回 ``Token`` 供复位。

    在请求/任务入口调用，结束时调用 ``reset_trace_id`` 复位，避免泄漏到
    后续无关联的代码路径。
    """
    return trace_id_ctx.set(trace_id or new_trace_id())


def reset_trace_id(token: contextvars.Token[str]) -> None:
    """复位 trace_id 到入口前的值。"""
    trace_id_ctx.reset(token)


__all__ = [
    "new_trace_id",
    "reset_trace_id",
    "set_trace_id",
    "trace_id_ctx",
]
