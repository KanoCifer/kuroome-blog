from __future__ import annotations

from datetime import UTC, datetime

from bson import ObjectId
from bson.errors import InvalidId

from app.models.beanie import MessageBoard, Post
from app.repositories.admin_repo import AdminRepo


class AdminDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


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
        category_id: int,
        is_pinned: int,
    ) -> str:
        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise AdminDomainError("Category not found", 404)

        now = datetime.now(UTC)
        post = Post(
            title=title,
            body=body,
            summary=summary,
            category_id=category_id,
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
        category_id: int,
        is_pinned: int,
    ) -> None:
        oid = self._to_object_id(post_id, "非法的博客ID")
        existing_post = await self.repo.get_post_by_id(oid)
        if not existing_post:
            raise AdminDomainError("Blog post not found", 404)

        category = await self.repo.get_category_by_id(category_id)
        if not category:
            raise AdminDomainError("Category not found", 404)

        await self.repo.update_post_by_id(
            oid,
            {
                "title": title,
                "body": body,
                "summary": summary,
                "category_id": category_id,
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

    async def get_admin_comments(self) -> dict[str, list[dict]]:
        pending: list[dict] = []
        approved: list[dict] = []

        cursor = self.repo.get_recent_posts(limit=100)
        async for post in cursor:
            post_id_str = str(post.id)
            post_title = post.title or "Untitled"

            for comment in post.comments:
                item = {
                    "id": str(comment.id),
                    "post_id": post_id_str,
                    "post_title": post_title,
                    "author": comment.author or "Anonymous",
                    "email": comment.email or "",
                    "body": comment.body or "",
                    "site": comment.site or "",
                    "from_admin": comment.from_admin or False,
                    "reviewed": comment.reviewed or False,
                    "replied_id": str(comment.replied_id)
                    if comment.replied_id
                    else None,
                    "created_at": comment.created_at
                    if comment.created_at
                    else None,
                }
                if comment.reviewed:
                    approved.append(item)
                else:
                    pending.append(item)

        def sort_key(item: dict) -> float:
            created_at = item.get("created_at")
            if isinstance(created_at, datetime):
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=UTC)
                return created_at.timestamp()
            return 0.0

        pending.sort(key=sort_key, reverse=True)
        approved.sort(key=sort_key, reverse=True)
        return {"pending": pending, "approved": approved}

    async def approve_comment(self, *, comment_id: str) -> None:
        oid = self._to_object_id(comment_id, "Invalid comment ID")
        try:
            await self.repo.approve_comment(oid)
        except Exception as exc:
            raise AdminDomainError(
                f"Failed to approve comment: {exc!s}", 500
            ) from exc
        await self.cache.clear()

    async def delete_comment(self, *, comment_id: str) -> None:
        oid = self._to_object_id(comment_id, "Invalid comment ID")
        result = await self.repo.delete_comment(oid)
        if result.modified_count == 0:
            raise AdminDomainError("Comment not found", 404)
        await self.cache.clear()

    async def get_admin_messages(self) -> dict[str, list[dict]]:
        try:
            pending_messages = await self.repo.list_messages(review=0)
            approved_messages = await self.repo.list_messages(
                review=1,
                limit=50,
            )
        except Exception as exc:
            raise AdminDomainError(
                f"Failed to retrieve messages: {exc!s}",
                500,
            ) from exc

        def format_message(msg: MessageBoard) -> dict:
            return {
                "id": str(msg.id),
                "name": msg.name,
                "message": msg.message,
                "created_at": msg.created_at,
                "review": msg.review if hasattr(msg, "review") else 0,
            }

        return {
            "pending": [format_message(msg) for msg in pending_messages],
            "approved": [format_message(msg) for msg in approved_messages],
        }

    async def approve_message(self, *, message_id: str) -> None:
        try:
            oid = ObjectId(message_id)
        except Exception as exc:
            raise AdminDomainError("Invalid message ID.", 400) from exc

        msg = await self.repo.get_message_by_id(oid)
        if not msg:
            raise AdminDomainError("Message not found.", 404)

        msg.review = 1
        await self.repo.save_message(msg)

    async def delete_message(self, *, message_id: str) -> None:
        try:
            oid = ObjectId(message_id)
        except Exception as exc:
            raise AdminDomainError("Invalid message ID.", 400) from exc

        try:
            await self.repo.delete_message_by_id(oid)
            await self.cache.clear()
        except Exception as exc:
            raise AdminDomainError(
                f"Failed to delete message: {exc!s}",
                500,
            ) from exc
