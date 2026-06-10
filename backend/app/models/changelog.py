from __future__ import annotations

from beanie import Document
from pydantic import BaseModel


class ChangelogItem(BaseModel):
    type: str
    content: str


class Changelog(Document):
    version: str
    date: str
    title: str
    changes: list[ChangelogItem]

    class Settings:
        name = "changelog"
        use_cache = True
        cache_expiration_time = 7200  # 缓存过期时间，单位为秒
