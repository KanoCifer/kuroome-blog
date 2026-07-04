from __future__ import annotations

from beanie import SortDirection
from bson import ObjectId
from bson.errors import InvalidId

from app.models.blog import Post


class BlogRepo:
    """Blog data-access layer — MongoDB only.

    Category lookups (PostgreSQL) have been removed; tags live natively
    on the Post document. No async session is required.
    """

    async def list_posts(
        self,
        *,
        page: int,
        per_page: int,
        search: str | None,
    ) -> tuple[list[Post], int]:
        query = Post.find_all()
        if search is not None:
            query = query.find({"$text": {"$search": search}})
            sort_criteria = [
                ("score", {"$meta": "textScore"}),
                ("is_pinned", SortDirection.DESCENDING),
                ("created_at", SortDirection.DESCENDING),
            ]
        else:
            sort_criteria = [
                ("is_pinned", SortDirection.DESCENDING),
                ("created_at", SortDirection.DESCENDING),
            ]

        total = await query.count()
        skip = (page - 1) * per_page
        posts: list[Post] = (
            await query.sort(sort_criteria).skip(skip).limit(per_page).to_list()
        )
        return posts, total

    async def aggregate_tag_counts(self) -> list[dict[str, int]]:
        """Return [{name, count}] sorted by count desc, then name asc."""
        pipeline = [
            {"$unwind": "$tags"},
            {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
        ]
        docs: list[dict] = (
            await Post.find_all().aggregate(pipeline).to_list()
        )
        return [
            {"name": str(doc["_id"]), "count": int(doc.get("count", 0))}
            for doc in docs
            if doc.get("_id") is not None
        ]

    async def get_post_by_id(self, post_id: str) -> Post | None:
        """Look up by _id — accepts both string and ObjectId-like input."""
        try:
            oid = ObjectId(post_id)
        except (InvalidId, TypeError):
            return None
        return await Post.find_one({"_id": oid})

    async def list_posts_by_tag(
        self,
        tag: str,
        *,
        page: int,
        per_page: int,
    ) -> tuple[list[Post], int]:
        """Return (posts, total) for posts matching `tag`."""
        query = Post.find({"tags": tag})
        total = await query.count()
        skip = (page - 1) * per_page
        sort_criteria = [
            ("is_pinned", SortDirection.DESCENDING),
            ("created_at", SortDirection.DESCENDING),
        ]
        posts: list[Post] = (
            await query.sort(sort_criteria).skip(skip).limit(per_page).to_list()
        )
        return posts, total
