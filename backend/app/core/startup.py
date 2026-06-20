"""Server startup metadata.

Importable without circular dependencies — no app.api.* or app.main imports.
"""

from __future__ import annotations

import psutil

# 主机系统启动时间（unix 秒）。跨 worker / 跨 --reload 一致，
# 避免模块级 time.time() 在多 worker / 热重载下被刷新。
SERVER_START_TIME: float = psutil.boot_time()
