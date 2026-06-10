"""RSS domain models."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import ClassVar

import pymongo
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field
from pymongo import ASCENDING, DESCENDING, IndexModel


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
