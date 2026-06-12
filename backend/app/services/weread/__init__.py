from app.services.weread.recommend import BooksRecommend
from app.services.weread.shelf import WereadShelfService
from app.services.weread.stats import WereadStatsService


# 组合类 — 向后兼容
class WereadService(WereadShelfService, WereadStatsService, BooksRecommend):
    """微信读书服务（组合书架 + 阅读统计 + 推荐）"""


__all__ = [
    "WereadService",
    "WereadShelfService",
    "WereadStatsService",
    "BooksRecommend",
]
