"""Moment domain model."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any, ClassVar

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, TEXT, IndexModel


class MomentVisibility(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"
    UNLISTED = "unlisted"


class MomentStatus(StrEnum):
    PUBLISHED = "published"
    DRAFT = "draft"
    ARCHIVED = "archived"


class MomentAttachmentType(StrEnum):
    IMAGE = "image"
    LINK = "link"
    BOOK = "book"
    QUOTE = "quote"


class MomentAttachment(BaseModel):
    type: MomentAttachmentType = MomentAttachmentType.IMAGE
    url: str
    thumbnail_url: str | None = None
    title: str | None = None
    description: str | None = None
    meta: dict[str, Any] | None = None


class MomentLocation(BaseModel):
    name: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class Moment(Document):
    """Short-form note document model."""

    user_id: int
    content: str = Field(..., min_length=1, max_length=2000)
    summary: str | None = None
    visibility: MomentVisibility = MomentVisibility.PUBLIC
    status: MomentStatus = MomentStatus.PUBLISHED
    mood: str | None = None
    tags: list[str] = Field(default_factory=list)
    attachments: list[MomentAttachment] = Field(default_factory=list)
    location: MomentLocation | None = None
    source: str | None = None
    is_pinned: bool = False
    allow_comment: bool = True
    like_count: int = 0
    comment_count: int = 0
    view_count: int = 0
    published_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    deleted_at: datetime | None = None

    class Settings:
        name = "moments"
        use_cache = True
        cache_expiration_time = timedelta(seconds=10)
        indexes: ClassVar[list] = [
            IndexModel(
                [
                    ("visibility", ASCENDING),
                    ("status", ASCENDING),
                    ("deleted_at", ASCENDING),
                    ("is_pinned", DESCENDING),
                    ("published_at", DESCENDING),
                ],
                name="public_moment_feed_idx",
            ),
            IndexModel(
                [
                    ("user_id", ASCENDING),
                    ("status", ASCENDING),
                    ("updated_at", DESCENDING),
                ],
                name="user_moment_admin_idx",
            ),
            IndexModel(
                [("tags", ASCENDING), ("published_at", DESCENDING)],
                name="moment_tags_idx",
            ),
            IndexModel(
                [("content", TEXT), ("tags", TEXT)],
                name="moment_text_idx",
            ),
        ]
