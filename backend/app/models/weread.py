from datetime import UTC, datetime
from typing import Annotated, ClassVar

import pymongo
from beanie import Document, Indexed, Link
from pydantic import BaseModel, Field


class User(Document):
    user_id: Annotated[int, Indexed(unique=True)]
    api_key: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "weread_users"
        use_cache = True
        cache_expiration_time = 600  # 缓存过期时间，单位为秒


class WereadBook(Document):
    """单本书籍的具体信息，_id 即微信读书 bookId（str）

    _id 复用 bookId 的设计：让 UserBook.bookInfo 这个 Link 字段在
    fetch_links 时能直接通过 _id 完成 $lookup。
    """

    id: str = Field(
        alias="_id"
    )  # 即微信读书 bookId  # pyright: ignore[reportIncompatibleVariableOverride,reportGeneralTypeIssues]
    title: str
    author: str
    translator: str | None = None
    cover: str | None = None
    introduction: str | None = None
    category: str | None = None
    publisher: str | None = None
    publishTime: str | None = None
    isbn: str | None = None
    wordCount: int | None = None
    newRating: float | None = None
    newRatingCount: int | None = None
    newRatingDetails: dict | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "weread_books"
        use_cache = True
        cache_expiration_time = 600  # 缓存过期时间，单位为秒


class ReadProgress(BaseModel):
    """用户的阅读进度
    对应一个 bookId
    """

    chapterUid: int | None = None
    chapterOffset: int | None = None
    progress: int | None = None
    updateTime: int | None = None  # 最后阅读时间
    readingTime: int
    finishTime: int | None = None
    isStartReading: int  # 是否开始读


class UserBook(Document):
    user_id: Annotated[int, Indexed()]  # 用户ID
    bookId: str
    bookInfo: Link[WereadBook] | None = None
    readProgress: ReadProgress | None = None
    isTop: bool = False
    readUpdateTime: int | None = None
    finishReading: bool = False
    secret: bool = False  # 是否隐藏
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "weread_user_books"
        use_cache = True
        cache_expiration_time = 600  # 缓存过期时间，单位为秒
        indexes: ClassVar[list] = [
            [
                ("user_id", pymongo.ASCENDING),
                ("readUpdateTime", pymongo.DESCENDING),
            ],
        ]


class Archive(Document):
    """书单"""

    user_id: Annotated[int, Indexed()]  # 用户ID
    bookIds: list[str | None]
    albumIds: list[str | None]
    name: str


class ReadLongestItem(BaseModel):
    """读得最多的书"""

    bookId: str | None = None
    title: str | None = None
    author: str | None = None
    cover: str | None = None
    readTime: int = 0  # 秒
    finished: int = 0
    tags: list[str] = Field(default_factory=list)  # 标签


class ReadStatItem(BaseModel):
    """阅读统计摘要条目"""

    label: str  # "读过" / "读完" / "阅读" / "笔记"
    value: int


class PreferCategoryItem(BaseModel):
    """偏好分类"""

    categoryTitle: str
    readingTime: int  # 秒
    readingCount: int


class PreferAuthorItem(BaseModel):
    """偏好作者"""

    authorId: int | None = None
    name: str | None = None
    readingTime: str | None = None  # 格式化时长，如 "17小时50分钟"


class PreferPublisherItem(BaseModel):
    """偏好出版社"""

    name: str | None = None
    count: int = 0


class ReadDetailSnapshot(BaseModel):
    """一次 /readdata/detail 查询的完整快照，支持趋势图 & 排行。

    不持久化；视图层按需直拉远端，仅做接口级 Redis 缓存。
    """

    user_id: int
    mode: str  # weekly | monthly | annually | overall
    baseTime: int
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # 核心统计
    totalReadTime: int | None = None  # 秒
    readDays: int | None = None
    dayAverageReadTime: int | None = None
    compare: float | None = None
    readRate: int | None = None  # 文字阅读占比百分比
    wrReadTime: int | None = None  # 文字阅读时长(秒)
    wrListenTime: int | None = None  # 听书时长(秒)

    # 分桶时长，趋势图用 {"timestamp": seconds}
    readTimes: dict[str, int] | None = None

    # 排行 & 偏好
    readLongest: list[ReadLongestItem] | None = None
    readStat: list[ReadStatItem] | None = None
    preferCategory: list[PreferCategoryItem] | None = None
    preferTime: list[int] | None = None  # 24h阅读时段分布
    preferAuthor: list[PreferAuthorItem] | None = None
    preferPublisher: list[PreferPublisherItem] | None = None
