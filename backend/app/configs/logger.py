from __future__ import annotations

import contextlib
import os
import sys
from pathlib import Path

from loguru import logger

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
base = base.parent

log_path_env = os.getenv("LOG_PATH")
if log_path_env:
    log_path = Path(log_path_env)
else:
    log_dir = Path(os.getenv("LOG_DIR", base / "logs"))
    log_path = log_dir / "app.log"

with contextlib.suppress(FileNotFoundError):
    log_path.parent.mkdir(parents=True, exist_ok=True)

info_log_path = log_path.with_stem(f"{log_path.stem}_info")
error_log_path = log_path.with_stem(f"{log_path.stem}_error")

# INFO <= 级别 < ERROR 写入 app_info.log
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
logger.add(
    sink=error_log_path,
    level="ERROR",
    format=LOG_FORMAT,
    rotation=MAX_LOG_SIZE,
    retention=BACKUP_COUNT,
    encoding="utf-8",
)

__all__ = ["logger"]
