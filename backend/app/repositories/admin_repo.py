from __future__ import annotations

from beanie import SortDirection
from bson import ObjectId
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.blog import Post
from app.models.message import MessageBoard
from app.models.models import Category


class AdminRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_category_by_id(self, category_id: int) -> Category | None:
        result = await self.session.execute(
            select(Category).where(Category.id == category_id)
        )
        return result.scalar_one_or_none()

    async def create_post(self, post: Post):
        return await Post.insert_one(post)

    async def get_post_by_id(self, post_id: ObjectId) -> Post | None:
        return await Post.find_one(Post.id == post_id)

    async def update_post_by_id(
        self,
        post_id: ObjectId,
        update_data: dict,
    ) -> None:
        await Post.find_one(Post.id == post_id).set(update_data)

    async def delete_post_by_id(self, post_id: ObjectId) -> None:
        await Post.find_one(Post.id == post_id).delete()

    async def list_messages(self, *, review: int, limit: int | None = None):
        query = MessageBoard.find({"review": review}).sort(
            [("created_at", SortDirection.DESCENDING)]
        )
        if limit is not None:
            query = query.limit(limit)
        return await query.to_list()

    async def get_message_by_id(
        self,
        message_id: ObjectId,
    ) -> MessageBoard | None:
        return await MessageBoard.get(message_id)

    async def save_message(self, message: MessageBoard) -> None:
        await message.save()

    async def delete_message_by_id(self, message_id: ObjectId) -> None:
        await MessageBoard.find(MessageBoard.id == message_id).delete()
