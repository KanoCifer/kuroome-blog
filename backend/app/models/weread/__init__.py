"""微信读书模型包。"""

from app.models.weread.documents import Archive, ReadProgress, User, UserBook, WereadBook
from app.models.weread.weread_detail_raw import (
    ReadDetailAnnuallyRaw,
    ReadDetailMonthlyRaw,
    ReadDetailOverallRaw,
    ReadDetailRawAuthorItem,
    ReadDetailRawCategoryItem,
    ReadDetailRawCopyrightInfo,
    ReadDetailRawLongestItem,
    ReadDetailRawPublisherItem,
    ReadDetailRawRank,
    ReadDetailRawStat,
    ReadDetailWeeklyRaw,
)

__all__ = [
    "Archive",
    "ReadProgress",
    "ReadDetailAnnuallyRaw",
    "ReadDetailMonthlyRaw",
    "ReadDetailOverallRaw",
    "ReadDetailRawAuthorItem",
    "ReadDetailRawCategoryItem",
    "ReadDetailRawCopyrightInfo",
    "ReadDetailRawLongestItem",
    "ReadDetailRawPublisherItem",
    "ReadDetailRawRank",
    "ReadDetailRawStat",
    "ReadDetailWeeklyRaw",
    "User",
    "UserBook",
    "WereadBook",
]
