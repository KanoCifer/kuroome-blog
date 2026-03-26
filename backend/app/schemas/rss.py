"""RSS schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RssArticleResponse(BaseModel):
    """RSS article response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    guid: str
    feed_url: str
    title: str
    link: str
    summary: str
    content: str
    author: str | None
    published: datetime | None
    fetched_at: datetime
    is_read: bool


class RssArticleListResponse(BaseModel):
    """RSS article list response with pagination."""

    items: list[RssArticleResponse]
    total: int
    page: int
    limit: int


class RssSubscriptionResponse(BaseModel):
    """RSS subscription response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    rss_url: str
    feed_title: str | None = None
    feed_link: str | None = None
    feed_description: str | None = None
    feed_published_at: datetime | None = None
    entry_count: int = 0
    last_fetched_at: datetime | None = None
    created_at: datetime | None


class RssMarkReadRequest(BaseModel):
    """Request to mark articles as read."""

    article_ids: list[str]


class RssRequest(BaseModel):
    """RSS feed request schema."""

    rss_url: str
    save_to_db: bool = False
