"""微信读书 Beanie Document 模型。"""

from __future__ import annotations

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
        cache_expiration_time = 600


class WereadBook(Document):
    """单本书籍的具体信息，_id 即微信读书 bookId（str）

    _id 复用 bookId 的设计：让 UserBook.bookInfo 这个 Link 字段在
    fetch_links 时能直接通过 _id 完成 $lookup。
    """

    id: str = Field(
        alias="_id"
    )  # pyright: ignore[reportIncompatibleVariableOverride,reportGeneralTypeIssues]
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
        cache_expiration_time = 600


class ReadProgress(BaseModel):
    """用户的阅读进度，对应一个 bookId"""

    chapterUid: int | None = None
    chapterOffset: int | None = None
    progress: int | None = None
    updateTime: int | None = None  # 最后阅读时间
    readingTime: int
    finishTime: int | None = None
    isStartReading: int  # 是否开始读


class UserBook(Document):
    user_id: Annotated[int, Indexed()]
    bookId: str
    title: str | None = None
    author: str | None = None
    cover: str | None = None
    category: str | None = None
    bookInfo: Link[WereadBook] | None = None
    readProgress: ReadProgress | None = None
    isTop: bool = False
    readUpdateTime: int | None = None
    updateTime: int | None = None
    finishReading: bool = False
    secret: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "weread_user_books"
        use_cache = True
        cache_expiration_time = 600
        indexes: ClassVar[list] = [
            [
                ("user_id", pymongo.ASCENDING),
                ("readUpdateTime", pymongo.DESCENDING),
            ],
        ]


class Archive(Document):
    """书单"""

    user_id: Annotated[int, Indexed()]
    bookIds: list[str | None]
    albumIds: list[str | None]
    name: str
