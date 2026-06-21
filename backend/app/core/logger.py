from __future__ import annotations

import asyncio
import contextlib
import os
import sys
from pathlib import Path

from loguru import logger

from app.core.config import get_settings

LOG_FORMAT = "{time:YYYY-MM-DD HH:mm:ss} - {name} - {level} - {message}"
MAX_LOG_SIZE = "1 MB"
BACKUP_COUNT = 5

logger.remove()
logger.add(
    sink=sys.stderr,
    level="INFO",
    format=LOG_FORMAT,
)

base = Path(__file__).parent.parent
base: Path = base.parent

log_path_env: str | None = os.getenv("LOG_PATH")
if log_path_env:
    log_path = Path(log_path_env)
else:
    log_dir = Path(os.getenv("LOG_DIR", base / "logs"))
    log_path: Path = log_dir / "app.log"

with contextlib.suppress(FileNotFoundError):
    log_path.parent.mkdir(parents=True, exist_ok=True)

info_log_path: Path = log_path.with_stem(f"{log_path.stem}_info")
error_log_path: Path = log_path.with_stem(f"{log_path.stem}_error")

# INFO <= 级别 < ERROR 写入 app_info.log
if get_settings().SAVE_LOGS:
    logger.add(
        sink=info_log_path,
        level="INFO",
        format=LOG_FORMAT,
        rotation=MAX_LOG_SIZE,
        retention=BACKUP_COUNT,
        encoding="utf-8",
        filter=lambda record: record["level"].no < logger.level("ERROR").no,
    )

# 级别 >= ERROR 写入 app_error.log
if get_settings().SAVE_LOGS:
    logger.add(
        sink=error_log_path,
        level="ERROR",
        format=LOG_FORMAT,
        rotation=MAX_LOG_SIZE,
        retention=BACKUP_COUNT,
        encoding="utf-8",
    )


# 持有 fire-and-forget 的入队任务引用，防止被 GC 提前回收；
# 任务完成回调里自我清理，无内存泄漏。
_kiq_tasks: set[asyncio.Task] = set()


def _safe_db_sink(message):
    """将带 `persist=True` 的日志通过 Taskiq 异步入库。

    loguru sink 在同步上下文里被调用，无法直接 ``await``；而
    ``log_task.kiq()`` 是协程函数，必须 await 才会真正向 broker 入队
    （否则只是创建一个被丢弃的协程对象，日志永远到不了 worker）。
    这里取运行中的 event loop，用 ``create_task`` 把入队协程调度上去。

    在 sink 内部延迟 import，避免与 task 模块的循环导入
    （task → broker → logger → task）。
    """
    record = message.record
    if not record["extra"].get("persist"):
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # 当前线程没有运行中的 event loop（如 worker 启动早期、同步代码路径），
        # 无法调度入队；丢弃这条以避免抛错污染日志流。
        return
    try:
        extra = {k: v for k, v in record["extra"].items() if k != "persist"}
        from app.plugins.task.tasks.log_task import log_task

        task = loop.create_task(
            log_task.kiq(
                {
                    "timestamp": record["time"].timestamp(),
                    "level": record["level"].name,
                    "message": record["message"],
                    "extra": extra,
                }
            )
        )
        _kiq_tasks.add(task)
        task.add_done_callback(_kiq_tasks.discard)
    except Exception as e:
        sys.stderr.write(f"[log-sink] {e}\n")


if get_settings().SAVE_LOGS:
    logger.add(sink=_safe_db_sink, level="INFO", format="{message}")

__all__ = ["logger"]
