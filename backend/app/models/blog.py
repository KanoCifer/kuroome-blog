"""Blog domain models: Post & Comment."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import ClassVar

import pymongo
from beanie import Document, PydanticObjectId
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
    summary: str | None = None
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
        bson_encoders: ClassVar[dict] = {PydanticObjectId: str}
        model_config = ConfigDict(arbitrary_types_allowed=True)
