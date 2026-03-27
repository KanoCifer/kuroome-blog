from __future__ import annotations

from typing import Any

from pymongo.asynchronous.database import AsyncDatabase


class PublicRepo:
    def __init__(self, mongodb: AsyncDatabase) -> None:
        self.mongodb = mongodb

    async def list_sitemap_posts(self) -> list[dict[str, Any]]:
        """List posts for sitemap."""
        posts_collection = self.mongodb.collection("posts")
        cursor = posts_collection.find({}, {"_id": 1, "updated_at": 1})
        posts: list[dict[str, Any]] = []
        async for post in cursor:
            posts.append(post)
        return posts
