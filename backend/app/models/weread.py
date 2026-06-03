from datetime import UTC, datetime
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


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
    bookId: Annotated[str, Indexed(unique=True)]  # noqa: N815
    title: str
    author: str
    translator: str | None = None
    cover: str | None = None
    introduction: str | None = None
    publisher: str | None = None
    publishTime: str | None = None  # noqa: N815
    isbn: str | None = None
    wordCount: int | None = None  # noqa: N815
    newRating: float | None = None  # noqa: N815
    newRatingCount: int | None = None  # noqa: N815
    newRatingDetails: dict | None = None  # noqa: N815
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "weread_books"
        use_cache = True
        cache_expiration_time = 600  # 缓存过期时间，单位为秒


class UserBook(Document):
    user_id: Annotated[int, Indexed()]  # 用户ID
    bookId: str  # noqa: N815
    title: str
    author: str
    isTop: bool = False  # noqa: N815
    readUpdateTime: int | None = None  # noqa: N815
    finishReading: bool = False  # noqa: N815
    secret: bool = False  # 是否隐藏
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "weread_user_books"
        use_cache = True
        cache_expiration_time = 600  # 缓存过期时间，单位为秒


class Archive(Document):
    """书单"""

    user_id: Annotated[int, Indexed()]  # 用户ID
    bookIds: list[str | None]  # noqa: N815
    albumIds: list[str | None]  # noqa: N815
    name: str
