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
