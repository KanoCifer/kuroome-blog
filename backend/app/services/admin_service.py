from __future__ import annotations

from datetime import UTC, datetime

from bson import ObjectId
from bson.errors import InvalidId

from app.core.exceptions import AdminDomainError
from app.models.blog import Post
from app.repositories.admin_repo import AdminRepo
from app.services.blog_service import BlogService


class AdminService:
    def __init__(self, repo: AdminRepo, cache) -> None:
        self.repo = repo
        self.cache = cache

    @staticmethod
    def _to_object_id(value: str, error_message: str) -> ObjectId:
        try:
            return ObjectId(value)
        except InvalidId as exc:
            raise AdminDomainError(error_message, 400) from exc

    async def add_post(
        self,
        *,
        title: str,
        body: str,
        summary: str | None = None,
        cover: str | None = None,
        tags: list[str] | None = None,
        is_pinned: int,
    ) -> str:
        cleaned_tags = BlogService._clean_tags(tags)
        now = datetime.now(UTC)
        post = Post(
            title=title,
            body=body,
            summary=summary,
            cover=cover,
            tags=cleaned_tags,
            is_pinned=is_pinned,
            created_at=now,
            updated_at=now,
        )
        result = await self.repo.create_post(post)
        if not result or not result.id:
            raise AdminDomainError("Failed to add blog post请稍后再试", 500)

        await self.cache.clear()
        return str(result.id)

    async def update_post(
        self,
        *,
        post_id: str,
        title: str,
        body: str,
        summary: str | None = None,
        cover: str | None = None,
        tags: list[str] | None = None,
        is_pinned: int,
    ) -> None:
        oid = self._to_object_id(post_id, "非法的博客ID")
        existing_post = await self.repo.get_post_by_id(oid)
        if not existing_post:
            raise AdminDomainError("Blog post not found", 404)

        cleaned_tags = BlogService._clean_tags(tags)
        await self.repo.update_post_by_id(
            oid,
            {
                "title": title,
                "body": body,
                "summary": summary,
                "cover": cover,
                "tags": cleaned_tags,
                "is_pinned": is_pinned,
                "updated_at": datetime.now(UTC),
            },
        )
        await self.cache.clear()

    async def delete_post(self, *, post_id: str) -> None:
        oid = self._to_object_id(post_id, "Invalid blog post ID")
        existing_post = await self.repo.get_post_by_id(oid)
        if not existing_post:
            raise AdminDomainError("Blog post not found", 404)
        await self.repo.delete_post_by_id(oid)
        await self.cache.clear()
