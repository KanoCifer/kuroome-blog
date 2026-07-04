from __future__ import annotations

from bson import ObjectId

from app.models.blog import Post


class AdminRepo:
    """MongoDB-side post writes for the admin surface.

    No longer depends on an async SQLAlchemy session — category lookups
    (the only PG interaction) have been removed in the tag migration.
    """

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
