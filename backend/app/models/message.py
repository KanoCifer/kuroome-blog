"""Message board domain model."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, ClassVar

from beanie import Document, Indexed
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel


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
