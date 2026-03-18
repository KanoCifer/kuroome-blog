from __future__ import annotations

import contextlib
import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

# 日志格式（包含时间）
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
MAX_LOG_SIZE = 1 * 1024 * 1024  # 1MB
# 保留的备份日志数量
BACKUP_COUNT = 5  # 最多保留5个备份日志文件

# 配置基础日志（用于 root logger）
logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
)

# 精简Taskiq日志输出，仅保留警告及以上级别
# logging.getLogger("taskiq").setLevel(logging.WARNING)
# logging.getLogger("taskiq.worker").setLevel(logging.WARNING)
# logging.getLogger("taskiq.process-manager").setLevel(logging.WARNING)
# logging.getLogger("taskiq.receiver.receiver").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

# 创建 formatter 并设置到各处理器，确保文件也包含时间
formatter = logging.Formatter(LOG_FORMAT)


# 输出日志到文件
# 支持通过环境变量指定目录或完整路径，如果不提供则默认项目根下的 logs/ 目录
base = Path(__file__).parent.parent  # app/configs/ -> 项目根

log_path = None
log_path_env = os.getenv("LOG_PATH")
if log_path_env:
    # 直接使用给定路径
    log_path = Path(log_path_env)
else:
    log_dir = Path(os.getenv("LOG_DIR", base / "logs"))
    log_path = log_dir / "app.log"

# 确保日志目录存在
with contextlib.suppress(FileNotFoundError):
    log_path.parent.mkdir(parents=True, exist_ok=True)

file_handler = RotatingFileHandler(
    filename=log_path,
    encoding="utf-8",
    maxBytes=MAX_LOG_SIZE,
    backupCount=BACKUP_COUNT,
)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(formatter)
# 将处理器添加到 logger
logger.addHandler(file_handler)
