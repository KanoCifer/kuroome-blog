from __future__ import annotations

from typing import Any

from beanie import SortDirection
from bson import ObjectId
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.beanie import Comment, Post
from app.models.models import Category


class BlogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_categories(self) -> list[Category]:
        result = await self.session.execute(
            select(Category).order_by(Category.name)
        )
        return list(result.scalars().all())

    async def get_category_by_id(self, category_id: int) -> Category | None:
        result = await self.session.execute(
            select(Category).where(Category.id == category_id)
        )
        return result.scalar_one_or_none()

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
            await query.sort(sort_criteria)
            .skip(skip)
            .limit(per_page)
            .to_list()
        )
        return posts, total

    async def aggregate_category_counts(self) -> dict[int, int]:
        pipeline = [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]
        docs: list[dict] = await Post.find_all().aggregate(pipeline).to_list()
        category_counts: dict[int, int] = {}
        for doc in docs:
            cat_id = doc.get("_id")
            if cat_id is not None:
                category_counts[int(cat_id)] = int(doc.get("count", 0))
        return category_counts

    async def get_post_by_id(self, post_id: ObjectId) -> Post | None:
        return await Post.find_one({"_id": post_id})

    async def comment_exists_in_post(
        self,
        *,
        post_id: ObjectId,
        comment_id: ObjectId,
    ) -> bool:
        post = await Post.find_one(
            {"_id": post_id, "comments._id": comment_id}
        )
        return post is not None

    async def append_comment(
        self, *, post_id: ObjectId, comment: dict[str, Any]
    ) -> bool:
        post = await Post.find_one({"_id": post_id})
        if post is None:
            return False
        embedded_comment = Comment.model_validate(comment)
        post.comments.append(embedded_comment)
        await post.save()
        return True

    async def list_posts_by_category(self, category_id: int) -> list[Post]:
        return await (
            Post.find(Post.category_id == category_id)
            .sort([("created_at", SortDirection.DESCENDING)])
            .to_list()
        )
