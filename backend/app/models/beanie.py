from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, ClassVar

import pymongo
from beanie import Document, Indexed, PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field
from pymongo import ASCENDING, DESCENDING, IndexModel


class Comment(BaseModel):
    """Comment embedded in Post document."""

    id: PydanticObjectId = Field(default_factory=PydanticObjectId, alias="_id")
    author: str = "Anonymous"
    body: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    reviewed: bool = False
    replied_id: PydanticObjectId | None = None
    reply_to_author: str | None = None
    email: str | None = ""
    site: str | None = ""
    from_admin: bool = False

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
    bson_encoders: ClassVar[dict] = {PydanticObjectId: str}

    class Settings:
        use_cache = True
        cache_expiration_time = timedelta(seconds=10)


class Post(Document):
    """Blog post document model."""

    title: str
    body: str
    category_id: int | None = None
    is_pinned: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    comments: list[Comment] = Field(default_factory=list)
    likes: int = 0

    class Settings:
        name = "posts"
        use_cache = True
        cache_expiration_time = timedelta(seconds=10)
        indexes: ClassVar[list] = [
            IndexModel(
                [("is_pinned", DESCENDING), ("created_at", DESCENDING)]
            ),
            IndexModel([("category_id", ASCENDING)]),
            IndexModel([("title", pymongo.TEXT), ("body", pymongo.TEXT)]),
        ]
        # 关键配置：告诉 Pydantic 如何序列化 ObjectId
        bson_encoders: ClassVar[dict] = {PydanticObjectId: str}

        # 如果你使用的是 Pydantic v2，还需要加上这个配置
        model_config = ConfigDict(arbitrary_types_allowed=True)


class MessageBoard(Document):
    """Message board document model."""

    name: Annotated[str, Indexed()]
    message: Annotated[str, Indexed()]
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    review: int = 0
    from_admin: bool = False

    class Settings:
        name = "message_board"
        use_cache = True
        cache_expiration_time = timedelta(seconds=10)
        indexes: ClassVar[list] = [
            IndexModel([("review", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ]


class RssFeed(Document):
    """RSS feed document model."""

    title: str
    link: str
    description: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "rss_feeds"
        use_cache = True
        cache_expiration_time = timedelta(seconds=10)
        indexes: ClassVar[list] = [
            IndexModel([("created_at", DESCENDING)]),
        ]


class RssArticle(Document):
    """RSS article document model."""

    guid: str
    feed_url: str
    title: str = ""  # type: ignore
    link: str = ""
    summary: str = ""
    content: str = ""
    author: str | None = None
    published: datetime | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    read_by: list[int] = Field(default_factory=list)

    class Settings:
        name = "rss_articles"
        use_cache = True
        cache_expiration_time = timedelta(seconds=10)
        indexes: ClassVar[list] = [
            IndexModel(
                [("feed_url", ASCENDING), ("guid", ASCENDING)], unique=True
            ),
            IndexModel([("feed_url", ASCENDING), ("fetched_at", DESCENDING)]),
            IndexModel([("title", pymongo.TEXT), ("content", pymongo.TEXT)]),
        ]
        bson_encoders: ClassVar[dict] = {PydanticObjectId: str}
        model_config = ConfigDict(arbitrary_types_allowed=True)


class RssArticleGuidProjection(BaseModel):
    guid: str
