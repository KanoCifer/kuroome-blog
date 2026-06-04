from __future__ import annotations

from beanie import PydanticObjectId

from app.models.beanie import FriendLinks


class FriendLinkRepo:
    async def get_links(self) -> list[FriendLinks]:
        return await FriendLinks.find().sort("sort_order").to_list()

    async def get_link(self, link_id: str) -> FriendLinks | None:
        try:
            obj_id = PydanticObjectId(link_id)
        except Exception:
            return None
        return await FriendLinks.get(obj_id)

    async def create_link(self, link: FriendLinks) -> FriendLinks:
        created = await FriendLinks.insert_one(link)
        if created is None:
            raise RuntimeError("Friend link insert returned empty result")
        return created

    async def update_link(self, link: FriendLinks, data: dict) -> FriendLinks:
        await link.update({"$set": data})
        await link.sync()
        return link

    async def delete_link(self, link: FriendLinks) -> None:
        await link.delete()

    async def get_latest_sort_order(self) -> int:
        latest = (
            await FriendLinks.find().sort("-sort_order").limit(1).to_list()
        )
        return latest[0].sort_order if latest else -1
