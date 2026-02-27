from __future__ import annotations

import logging

# 日志格式（包含时间）
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# 配置基础日志（用于 root logger）
logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
)

logger = logging.getLogger(__name__)

# 创建 formatter 并设置到各处理器，确保文件也包含时间
formatter = logging.Formatter(LOG_FORMAT)

# 输出日志到控制台
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

# 输出日志到文件
file_handler = logging.FileHandler("app.log", encoding="utf-8")
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(formatter)

# 将处理器添加到 logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)
