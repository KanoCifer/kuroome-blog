from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.repositories.blog_repo import BlogRepo
from app.schemas.comment import PostComment


class BlogDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class BlogService:
    def __init__(self, repo: BlogRepo, cache) -> None:
        self.repo = repo
        self.cache = cache

    @staticmethod
    def _serialize_datetime(value: datetime | None) -> str | None:
        return value.isoformat() if value else None

    @staticmethod
    def _serialize_post(post, category: dict[str, Any] | None = None) -> dict:
        return {
            "_id": str(post.id),
            "title": post.title,
            "body": post.body,
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

        post_dicts: list[dict[str, Any]] = []
        for post in posts:
            cat_id = post.category_id
            category = category_map.get(cat_id) if cat_id is not None else None
            post_data = self._serialize_post(post, category)
            post_data["comments"] = []
            post_dicts.append(post_data)

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

        post_data = self._serialize_post(post, category_payload)

        reviewed_comments: list[dict[str, Any]] = []
        for comment in post.comments:
            if comment.reviewed:
                reviewed_comments.append(
                    {
                        "_id": str(comment.id),
                        "author": comment.author,
                        "body": comment.body,
                        "created_at": self._serialize_datetime(
                            comment.created_at
                        ),
                        "reviewed": comment.reviewed,
                        "replied_id": str(comment.replied_id)
                        if comment.replied_id
                        else None,
                        "reply_to_author": comment.reply_to_author or "",
                        "comments": [],
                    }
                )

        comment_map = {
            comment["_id"]: comment for comment in reviewed_comments
        }
        comment_tree: list[dict[str, Any]] = []

        for comment in reviewed_comments:
            replied_id = comment["replied_id"]
            if replied_id is None:
                comment_tree.append(comment)
                continue
            parent = comment_map.get(replied_id)
            if parent is not None:
                parent["comments"].append(comment)

        post_data["comments"] = comment_tree
        return post_data

    async def post_comment(self, data: PostComment) -> dict[str, str]:
        post_id = data.post_id
        body = data.body.strip()
        author = data.author.strip() or "Anonymous"
        created_at = datetime.now(UTC)
        post_obj_id = self._parse_object_id(post_id, "Invalid post ID")

        replied_id: ObjectId | None = None
        if data.reply_to:
            reply_to_obj = self._parse_object_id(
                data.reply_to,
                "Invalid reply_to format",
            )
            exists = await self.repo.comment_exists_in_post(
                post_id=post_obj_id,
                comment_id=reply_to_obj,
            )
            if not exists:
                raise BlogDomainError("Comment to reply not found", 404)
            replied_id = reply_to_obj

        comment: dict[str, Any] = {
            "_id": ObjectId(),
            "author": escape(author),
            "body": escape(body),
            "created_at": created_at,
            "reviewed": False,
        }

        if replied_id:
            comment["replied_id"] = replied_id
            if data.reply_to_author:
                comment["reply_to_author"] = data.reply_to_author

        try:
            updated = await self.repo.append_comment(
                post_id=post_obj_id, comment=comment
            )
            if not updated:
                raise BlogDomainError("Blog post not found", 404)
        except BlogDomainError:
            raise
        except Exception as exc:
            raise BlogDomainError(
                f"Failed to submit comment: {exc!s}", 500
            ) from exc

        await self.cache.clear()
        return {"_id": str(comment["_id"])}

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
