from app.services.weread.shelf import WereadShelfService
from app.services.weread.stats import WereadStatsService

# 组合类 — 向后兼容
class WereadService(WereadShelfService, WereadStatsService):
    """微信读书服务（组合书架 + 阅读统计）"""


__all__ = [
    "WereadShelfService",
    "WereadStatsService",
    "WereadService",
]
