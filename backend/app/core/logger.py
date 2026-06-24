"""structlog 单一来源 —— JSON 结构化日志。

设计（规约见 ``docs/rules/logging.md``）：
- 全仓日志统一走 ``structlog``，``from app.core.logger import logger``。
- structlog 经 ``wrap_for_formatter`` 把事件交回 stdlib ``logging``，
  由 ``ProcessorFormatter`` 统一渲染：业务日志与 uvicorn/taskiq/sqlalchemy 等
  foreign 记录走**同一条**处理器链、同一套 JSON 长相。
- 三文件路由（info/error/access）由各 FileHandler 上的 ``logging.Filter``
  决定：filter 在 format 之前跑，此时 structlog 记录的 ``record.msg`` 还是
  event_dict（dict），可据此读 ``persist_to``；foreign 记录用 ``record.name``
  与 ``record.levelno`` 判断。（structlog 26.x 的 ``ProcessorFormatter`` 不捕获
  ``DropEvent``，故不能用处理器丢记录。）
- trace_id 由 ``_add_trace_id`` 处理器从 contextvar 注入，FastAPI middleware
  与 taskiq TraceMiddleware 负责设置/复位（见 ``logging_context.py``）。
- DB 持久化：专用 ``_DBHandler`` 终端处理器 ``_db_enqueue`` 做 fire-and-forget
  入队，双门准入（``persist`` 或 level ≥ ``DB_LOG_LEVEL``）。
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import logging.handlers
import os
import sys
from datetime import datetime
from pathlib import Path

import structlog

from app.core.config import get_settings
from app.core.logging_context import trace_id_ctx

# -----------------------------------------------------------------------------
# 阈值与路径
# -----------------------------------------------------------------------------
_LOG_LEVEL = os.getenv("LOG_LEVEL") or get_settings().LOG_LEVEL
_DB_LOG_LEVEL = get_settings().DB_LOG_LEVEL
_DB_LEVEL_NO = getattr(
    logging, _DB_LOG_LEVEL, logging.WARNING
)  # "WARNING" -> 30
_ERROR_NO = logging.ERROR

MAX_LOG_SIZE = 1_000_000  # 1 MB
BACKUP_COUNT = 5
ACCESS_MAX_LOG_SIZE = 10_000_000  # 10 MB
ACCESS_BACKUP_COUNT = 3

# 写入 DB extra 时排除的键：渲染/路由元数据、callsite、内部标记。
# 保留业务 bind 字段与 trace_id（与旧 loguru DB sink 行为一致）。
_DB_EXCLUDE = frozenset(
    {
        "event",
        "level",
        "level_number",
        "timestamp",
        "logger",
        "logger_name",
        "filename",
        "func_name",
        "lineno",
        "_record",
        "_from_structlog",
        "persist",
        "persist_to",
    }
)

# 仅路由到 access.log 的 stdlib logger 名（噪音剥离出主轨迹）
_ACCESS_ONLY_LOGGERS = frozenset({"uvicorn.access"})

# -----------------------------------------------------------------------------
# 处理器：trace_id / timestamper
# -----------------------------------------------------------------------------
_timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)


def _add_trace_id(logger, method_name, event_dict):
    """从 contextvar 注入 trace_id，缺省显示 "-"。"""
    event_dict.setdefault("trace_id", trace_id_ctx.get())
    return event_dict


# 两端共享的前置链：业务记录与 foreign 记录都跑一遍，产出统一 event_dict。
# 注意：此处**不得**放 ``filter_by_level`` 或任何副作用处理器——
#   1. ``filter_by_level`` 在 ``foreign_pre_chain`` 里收到 ``logger=None`` 会抛
#      AttributeError（foreign 记录没有 structlog wrapper logger）；foreign 记录
#      的级别过滤交给 stdlib handler 的 ``setLevel``。
#   2. 副作用处理器会经每个 handler 的 ``foreign_pre_chain`` 各跑一遍而重复触发；
#      DB 入队放在专用 handler 的终端处理器里，确保每条记录只入队一次。
shared_processors = [
    _add_trace_id,
    structlog.stdlib.add_log_level,
    structlog.stdlib.add_log_level_number,
    structlog.stdlib.add_logger_name,
    structlog.stdlib.PositionalArgumentsFormatter(),
    _timestamper,
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
    structlog.processors.UnicodeDecoder(),
    structlog.processors.CallsiteParameterAdder(
        {
            structlog.processors.CallsiteParameter.FILENAME,
            structlog.processors.CallsiteParameter.FUNC_NAME,
            structlog.processors.CallsiteParameter.LINENO,
        }
    ),
]

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        *shared_processors,
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)


# -----------------------------------------------------------------------------
# 路由：用 logging.Filter 决定某条记录是否进该 handler
# -----------------------------------------------------------------------------
# structlog 26.x 的 ``ProcessorFormatter`` 在其 processor 循环里**不**捕获
# ``DropEvent``，故不能靠处理器丢记录。``logging.Filter`` 在 format 之前跑，
# 此时 structlog 记录的 ``record.msg`` 还是 event_dict（dict），foreign 记录
# 则是原始消息串——据此判断 ``persist_to`` / logger 名 / 级别即可。
def _is_access_record(record: logging.LogRecord) -> bool:
    if record.name in _ACCESS_ONLY_LOGGERS:
        return True
    msg = record.msg
    return isinstance(msg, dict) and msg.get("persist_to") == "access"


class _InfoFilter(logging.Filter):
    """app_info.log：INFO <= 级别 < ERROR，排除 access 噪音。"""

    def filter(self, record: logging.LogRecord) -> bool:
        if record.levelno >= _ERROR_NO:
            return False
        return not _is_access_record(record)


class _ErrorFilter(logging.Filter):
    """app_error.log：级别 >= ERROR。"""

    def filter(self, record: logging.LogRecord) -> bool:
        return record.levelno >= _ERROR_NO


class _AccessFilter(logging.Filter):
    """app_access.log：access / 第三方调用 / 审计事件。"""

    def filter(self, record: logging.LogRecord) -> bool:
        return _is_access_record(record)


# -----------------------------------------------------------------------------
# 渲染器：终端 Console（dev），文件统一 JSON
# -----------------------------------------------------------------------------
_stderr_renderer = (
    structlog.dev.ConsoleRenderer()
    if sys.stderr.isatty()
    else structlog.processors.JSONRenderer()
)
_json_renderer = structlog.processors.JSONRenderer()

_foreign_pre_chain = shared_processors


def _make_formatter(terminal) -> structlog.stdlib.ProcessorFormatter:
    return structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=_foreign_pre_chain,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            terminal,
        ],
    )


# -----------------------------------------------------------------------------
# 日志目录
# -----------------------------------------------------------------------------
base = Path(__file__).resolve().parent.parent
base = base.parent

_log_path_env: str | None = os.getenv("LOG_PATH")
if _log_path_env:
    log_path = Path(_log_path_env)
else:
    log_dir = Path(os.getenv("LOG_DIR", base / "logs"))
    log_path = log_dir / "app.log"

log_path.parent.mkdir(parents=True, exist_ok=True)

info_log_path = log_path.with_stem(f"{log_path.stem}_info")
error_log_path = log_path.with_stem(f"{log_path.stem}_error")
access_log_path = log_path.with_stem(f"{log_path.stem}_access")


# -----------------------------------------------------------------------------
# DB sink：fire-and-forget 持久化到 PostgreSQL
# -----------------------------------------------------------------------------
# 持有入队任务引用，防止被 GC 提前回收；完成回调里自我清理，无内存泄漏。
_kiq_tasks: set[asyncio.Task] = set()


def _db_enqueue(logger, method_name, event_dict):
    """将日志通过 Taskiq 异步入库（双门准入，见 ``docs/rules/logging.md`` §7）。

    1. 显式 ``persist`` 标记 → 入库；
       或 level >= ``DB_LOG_LEVEL``（默认 WARNING）→ 入库；
       其余丢弃，避免 INFO 全量灌进 ``Log`` 表。
    2. 仅作为 ``_DBHandler`` 的终端处理器运行 → 每条记录只入队一次
       （shared_processors 不含副作用，foreign 记录多 handler 重复跑也安全）。

    处理器在同步上下文里被调用，无法直接 ``await``；``log_task.kiq()`` 是协程
    函数，必须 await 才会真正入队，故取运行中的 event loop 用 ``create_task``
    调度。延迟 import 避免与 task 模块的循环导入（task → broker → logger → task）。
    """
    level_no = event_dict.get("level_number", 0)
    persist = event_dict.get("persist")
    if not persist and level_no < _DB_LEVEL_NO:
        return ""

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # 当前线程无运行中的 event loop（worker 启动早期、同步代码路径），
        # 无法调度入队；丢弃这条以避免抛错污染日志流。
        return ""

    try:
        extra = {k: v for k, v in event_dict.items() if k not in _DB_EXCLUDE}
        ts_iso = event_dict.get("timestamp")
        try:
            ts_epoch = (
                datetime.fromisoformat(ts_iso).timestamp() if ts_iso else None
            )
        except TypeError, ValueError:
            ts_epoch = None

        from app.plugins.task.tasks.log_task import log_task

        task = loop.create_task(
            log_task.kiq(
                {
                    "timestamp": ts_epoch,
                    "level": event_dict.get("level", "info"),
                    "message": event_dict.get("event", ""),
                    "extra": extra,
                }
            )
        )
        _kiq_tasks.add(task)
        task.add_done_callback(_kiq_tasks.discard)
    except Exception as e:
        sys.stderr.write(f"[log-sink] {e}\n")
    return ""


class _DBHandler(logging.Handler):
    """触发 ProcessorFormatter 链（含 ``_db_enqueue``）但不写任何输出。"""

    def emit(self, record: logging.LogRecord) -> None:
        # self.format 跑 foreign_pre_chain + 终端处理器，副作用即入队；
        # 返回值是空串，忽略。sink 自身异常绝不冒泡打断业务日志流。
        with contextlib.suppress(Exception):
            self.format(record)


# -----------------------------------------------------------------------------
# 组装 root logger
# -----------------------------------------------------------------------------
_root = logging.getLogger()
# 清掉 basicConfig / 框架自带的 handler，全仓由下面四个 handler 接管
for _h in list(_root.handlers):
    _root.removeHandler(_h)
_root.setLevel(logging.INFO)

# 终端：一套渲染，级别由 LOG_LEVEL 控制
_stderr_handler = logging.StreamHandler(sys.stderr)
_stderr_handler.setLevel(_LOG_LEVEL)
_stderr_handler.setFormatter(_make_formatter(_stderr_renderer))
_root.addHandler(_stderr_handler)

if get_settings().SAVE_LOGS:
    # app_info.log：INFO <= 级别 < ERROR 的主轨迹，排除 access 噪音
    _info_handler = logging.handlers.RotatingFileHandler(
        info_log_path,
        maxBytes=MAX_LOG_SIZE,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    _info_handler.setLevel(logging.INFO)
    _info_handler.addFilter(_InfoFilter())
    _info_handler.setFormatter(_make_formatter(_json_renderer))
    _root.addHandler(_info_handler)

    # app_error.log：级别 >= ERROR
    _error_handler = logging.handlers.RotatingFileHandler(
        error_log_path,
        maxBytes=MAX_LOG_SIZE,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    _error_handler.setLevel(logging.ERROR)
    _error_handler.addFilter(_ErrorFilter())
    _error_handler.setFormatter(_make_formatter(_json_renderer))
    _root.addHandler(_error_handler)

    # app_access.log：access / 第三方调用 / 审计事件，从主轨迹剥离
    _access_handler = logging.handlers.RotatingFileHandler(
        access_log_path,
        maxBytes=ACCESS_MAX_LOG_SIZE,
        backupCount=ACCESS_BACKUP_COUNT,
        encoding="utf-8",
    )
    _access_handler.setLevel(logging.INFO)
    _access_handler.addFilter(_AccessFilter())
    _access_handler.setFormatter(_make_formatter(_json_renderer))
    _root.addHandler(_access_handler)

    # DB 持久化 handler：终端处理器 _db_enqueue 入队，双门准入
    _db_handler = _DBHandler()
    _db_handler.setLevel(
        logging.INFO
    )  # 低门栏，让 persist=True 的 INFO 能进；_db_enqueue 再判
    _db_handler.setFormatter(_make_formatter(_db_enqueue))
    _root.addHandler(_db_handler)


# -----------------------------------------------------------------------------
# foreign logger 收口：让 uvicorn/taskiq/sqlalchemy 透传到 root（取代 InterceptHandler）
# -----------------------------------------------------------------------------
def _install_foreign_propagation() -> None:
    """清掉框架自带 handler、开 propagate，让 foreign 记录走 root 统一渲染。

    取代旧 ``InterceptHandler``：structlog 的 ``ProcessorFormatter`` +
    ``foreign_pre_chain`` 已能在 root 上把 stdlib 记录渲染成同款 JSON，无需
    再用 handler 拦截转发（也就消除了旧实现里 ``name``→``origin`` 的 workaround）。
    """
    for name in (
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "taskiq",
        "sqlalchemy.engine",
    ):
        std_logger = logging.getLogger(name)
        std_logger.handlers = []
        std_logger.propagate = True


_install_foreign_propagation()

logger = structlog.get_logger()

__all__ = ["logger"]
