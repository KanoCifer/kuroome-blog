"""Subscription notification log domain model."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import ClassVar

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel


class SubscriptionLog(Document):
    """订阅通知日志"""

    sub_id: int
    user_id: int
    reminder_type: str  # "30_days", "7_days", etc.
    channels_sent: list[str]
    sent_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    status: str = "sent"  # "sent", "failed"
    error_message: str | None = None

    class Settings:
        name = "subscription_logs"
        indexes: ClassVar[list] = [
            IndexModel([("sub_id", ASCENDING), ("sent_at", DESCENDING)]),
            IndexModel([("user_id", ASCENDING), ("sent_at", DESCENDING)]),
        ]
        use_cache = True
        cache_expiration_time = timedelta(seconds=600)
