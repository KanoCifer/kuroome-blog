"""Friend links domain model."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


class FriendLinks(Document):
    """友情链接文档模型"""

    name: str
    url: str
    sort_order: Annotated[int, Indexed()] = 0
    favicon: str | None = None
    description: str | None = None
    email: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "friend_links"
        use_cache = True
        cache_expiration_time = timedelta(seconds=600)
