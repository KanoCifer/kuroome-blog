from __future__ import annotations

from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.core.exceptions import BlogDomainError
from app.repositories.blog_repo import BlogRepo


class BlogService:
    def __init__(self, repo: BlogRepo) -> None:
        self.repo = repo

    @staticmethod
    def _serialize_datetime(value) -> str | None:
        return value.isoformat() if value else None

    @staticmethod
    def _serialize_post(post) -> dict:
        return {
            "_id": str(post.id),
            "title": post.title,
            "body": post.body,
            "summary": post.summary,
            "cover": post.cover,
            "tags": post.tags or [],
            "is_pinned": post.is_pinned,
            "created_at": BlogService._serialize_datetime(post.created_at),
            "updated_at": BlogService._serialize_datetime(post.updated_at),
        }

    @staticmethod
    def _parse_object_id(value: str, message: str) -> ObjectId:
        try:
            return ObjectId(value)
        except InvalidId as exc:
            raise BlogDomainError(message, 400) from exc

    @staticmethod
    def _clean_tags(tags: list[str] | None) -> list[str]:
        """Dedup + strip + truncate; drop empties."""
        cleaned: list[str] = []
        if not tags:
            return cleaned
        for tag in tags:
            value = tag.strip()
            if value and value not in cleaned:
                cleaned.append(value[:50])
        return cleaned

    async def get_blogs(self, page: int, search: str | None) -> dict:
        per_page = 10
        posts, total = await self.repo.list_posts(
            page=page,
            per_page=per_page,
            search=search,
        )

        pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        tag_counts = await self.repo.aggregate_tag_counts()

        post_dicts: list[dict[str, Any]] = [
            self._serialize_post(post) for post in posts
        ]

        return {
            "posts": post_dicts,
            "tags": tag_counts,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": pages,
                "has_prev": page > 1,
                "has_next": page < pages,
                "prev_num": page - 1 if page > 1 else None,
                "next_num": page + 1 if page < pages else None,
            },
        }

    async def get_blog_post(self, post_id: str | None) -> dict:
        if not post_id:
            raise BlogDomainError(
                "Either _id or post_id parameter is required",
                400,
            )

        self._parse_object_id(post_id, "Invalid blog post ID")
        post = await self.repo.get_post_by_id(post_id)
        if not post:
            raise BlogDomainError("Blog post not found", 404)

        return self._serialize_post(post)

    async def list_tags(self) -> list[dict[str, int]]:
        return await self.repo.aggregate_tag_counts()

    async def get_posts_by_tag(
        self,
        tag: str,
        *,
        page: int = 1,
        per_page: int = 10,
    ) -> dict:
        tag = tag.strip()
        if not tag:
            raise BlogDomainError("Tag is required", 400)

        posts, total = await self.repo.list_posts_by_tag(
            tag,
            page=page,
            per_page=per_page,
        )
        post_dicts = [self._serialize_post(post) for post in posts]
        return {"posts": post_dicts, "tag": tag, "total": total}
