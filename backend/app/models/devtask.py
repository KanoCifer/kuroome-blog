"""DevTask domain model."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


class DevTask(Document):
    """DevTask document model."""

    user_id: int
    title: str
    description: str | None = None
    priority: str = "default"
    status: str = "todo"
    sort_order: Annotated[int, Indexed()] = 0
    due_date: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "dev_tasks"
        use_cache = True
        cache_expiration_time = timedelta(seconds=10)
