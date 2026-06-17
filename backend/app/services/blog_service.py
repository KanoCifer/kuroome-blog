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
    def _serialize_post(post, category: dict[str, Any] | None = None) -> dict:
        return {
            "_id": str(post.id),
            "title": post.title,
            "body": post.body,
            "summary": post.summary,
            "cover": post.cover,
            "category_id": post.category_id,
            "is_pinned": post.is_pinned,
            "created_at": BlogService._serialize_datetime(post.created_at),
            "updated_at": BlogService._serialize_datetime(post.updated_at),
            "category": category,
        }

    @staticmethod
    def _parse_object_id(value: str, message: str) -> ObjectId:
        try:
            return ObjectId(value)
        except InvalidId as exc:
            raise BlogDomainError(message, 400) from exc

    async def _get_categories_with_counts(
        self,
    ) -> tuple[list[dict[str, Any]], dict[int, int]]:
        categories = await self.repo.list_categories()
        category_counts = await self.repo.aggregate_category_counts()
        category_list = [
            {
                "id": category.id,
                "name": category.name,
                "posts_count": category_counts.get(category.id, 0),
            }
            for category in categories
        ]
        return category_list, category_counts

    async def _get_category_map(self) -> dict[int, dict[str, Any]]:
        categories = await self.repo.list_categories()
        return {
            category.id: {"id": category.id, "name": category.name}
            for category in categories
        }

    async def get_blogs(self, page: int, search: str | None) -> dict:
        per_page = 10
        posts, total = await self.repo.list_posts(
            page=page,
            per_page=per_page,
            search=search,
        )

        pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        (
            category_list,
            category_counts,
        ) = await self._get_categories_with_counts()
        category_map = await self._get_category_map()

        post_dicts: list[dict[str, Any]] = [
            self._serialize_post(
                post,
                category_map.get(post.category_id)
                if post.category_id is not None
                else None,
            )
            for post in posts
        ]

        return {
            "posts": post_dicts,
            "categories": category_list,
            "category_counts": category_counts,
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

        object_id = self._parse_object_id(post_id, "Invalid blog post ID")
        post = await self.repo.get_post_by_id(object_id)
        if not post:
            raise BlogDomainError("Blog post not found", 404)

        category_payload: dict[str, Any] | None = None
        if post.category_id:
            category = await self.repo.get_category_by_id(post.category_id)
            if category:
                category_payload = {"id": category.id, "name": category.name}

        return self._serialize_post(post, category_payload)

    async def get_categories(self) -> list[dict[str, Any]]:
        categories = await self.repo.list_categories()
        category_counts = await self.repo.aggregate_category_counts()
        return [
            {
                "id": category.id,
                "name": category.name,
                "post_count": category_counts.get(category.id, 0),
            }
            for category in categories
        ]

    async def get_posts_by_category(self, category_id: int) -> dict[str, Any]:
        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise BlogDomainError("Category not found", 404)

        category_payload = {"id": category.id, "name": category.name}
        posts = await self.repo.list_posts_by_category(category_id)
        post_dicts = [
            self._serialize_post(post, category_payload) for post in posts
        ]

        return {"posts": post_dicts, "category": category_payload}
