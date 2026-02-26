from __future__ import annotations

import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
# 输出日志到控制台
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# 输出日志到文件
file_handler = logging.FileHandler("app.log")
file_handler.setLevel(logging.INFO)

# 将处理器添加到 logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)
