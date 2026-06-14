"""微信读书 /readdata/detail API 四种 mode 原始响应模型。

四种 mode (weekly/monthly/annually/overall) 返回的字段逐级递增：
- Weekly     → 基础统计 + rank
- Monthly    → 同上 + preferCategory + readStat
- Annually   → 同上 + preferAuthor + preferPublisher + readRate/wrReadTime
- Overall    → 同上 + preferTime + preferTimeWord + medals

直接作为 API 响应类型返回前端，不经过二次处理。
"""

from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ReadDetailRawBase(BaseModel):
    """所有 mode 原始响应的公共基类，含业务附加字段"""

    user_id: int
    mode: str  # weekly | monthly | annually | overall
    baseTime: int
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ── 公用嵌套模型 ─────────────────────────────────────────────────


class ReadDetailBook(BaseModel):
    """readLongest 数组项中的 book 字段"""

    bookId: str | None = None
    title: str | None = None
    author: str | None = None
    translator: str | None = None
    intro: str | None = None
    cover: str | None = None


class ReadDetailRawLongestItem(BaseModel):
    """readLongest 数组项（book 或 albumInfo 二选一）"""

    book: ReadDetailBook | None = None
    albumInfo: dict | None = None
    readTime: int = 0
    tags: list[str] = Field(default_factory=list)


class ReadDetailRawRank(BaseModel):
    """仅 Weekly 返回的 rank"""

    text: str
    scheme: str = "weread://fRank"


class ReadDetailRawStat(BaseModel):
    """readStat 数组项（Monthly 及以上）
    stat ： 读过，读完，阅读，笔记
    """

    stat: str
    counts: str


class ReadDetailRawCategoryItem(BaseModel):
    """preferCategory 数组项（Monthly 及以上）"""

    categoryTitle: str
    readingCount: int
    readingTime: int


class ReadDetailRawAuthorItem(BaseModel):
    """preferAuthor 数组项（Annually 及以上）"""

    name: str | None = None
    count: int | None = None
    readTime: str | None = None  # 格式化时长，如 "17小时50分钟"


class ReadDetailRawCopyrightInfo(BaseModel):
    """preferCp[].copyrightInfo"""

    name: str
    userVid: int = 0
    role: int = 0
    avatar: str = ""
    cpType: int = 0


class ReadDetailRawPublisherItem(BaseModel):
    """preferPublisher 数组项"""

    name: str | None = None
    count: int = 0


# ── 四种 mode 各自的 BaseModel ─────────────────────────────────


class ReadDetailWeeklyRaw(ReadDetailRawBase):
    """Weekly mode — 周阅读统计"""

    readTimes: dict[str, int] | None = None  # 按天统计的阅读时长 s
    readDays: int | None = None  # 阅读天数
    readLongest: list[ReadDetailRawLongestItem] | None = None
    rank: ReadDetailRawRank | None = None
    compare: float | None = None  # 与上周期相比 0-1
    dayAverageReadTime: int | None = None  # 日均阅读时长
    totalReadTime: int | None = None  # 总阅读时长 s


class ReadDetailMonthlyRaw(ReadDetailWeeklyRaw):
    """Monthly mode — 月阅读统计（含分类偏好 + 统计摘要）"""

    preferCategory: list[ReadDetailRawCategoryItem] | None = None
    preferCategoryWord: str | None = None
    readStat: list[ReadDetailRawStat] | None = None


class ReadDetailAnnuallyRaw(ReadDetailMonthlyRaw):
    """Annually mode — 年阅读统计（含作者/出版社偏好 + 阅读速率）"""

    preferAuthor: list[ReadDetailRawAuthorItem] | None = None
    authorCount: int | None = None
    preferPublisher: list[ReadDetailRawPublisherItem] | None = None
    readRate: int | None = None  # 文字阅读占比百分比
    wrReadTime: int | None = None  # 文字阅读时长（秒）
    wrListenTime: int | None = None  # 听书时长（秒）


class ReadDetailOverallRaw(ReadDetailAnnuallyRaw):
    """Overall mode — 总阅读统计（含时段分布 + 勋章）"""

    preferTime: list[int] | None = None  # 24h 阅读时段分布（24 个 int）
    preferTimeWord: str | None = None
