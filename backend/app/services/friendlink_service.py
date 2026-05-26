from app.models.beanie import FriendLinks


class FriendLinkService:
    async def get_links(self) -> list[FriendLinks]:
        return await FriendLinks.find().sort("sort_order").to_list()

    async def get_link(self, link_id: str) -> FriendLinks | None:
        from beanie import PydanticObjectId

        try:
            obj_id = PydanticObjectId(link_id)
        except Exception:
            return None
        return await FriendLinks.get(obj_id)

    async def create_link(self, data: dict) -> FriendLinks:
        latest = (
            await FriendLinks.find().sort("-sort_order").limit(1).to_list()
        )
        sort_order = (latest[0].sort_order + 1) if latest else 0
        link = FriendLinks(**data, sort_order=sort_order)
        await link.insert()
        return link

    async def update_link(self, link_id: str, data: dict) -> FriendLinks:
        link = await self.get_link(link_id)
        if not link:
            raise ValueError("Friend link not found")
        await link.update({"$set": data})
        await link.sync()
        return link

    async def delete_link(self, link_id: str) -> None:
        link = await self.get_link(link_id)
        if not link:
            raise ValueError("Friend link not found")
        await link.delete()

    async def reorder_links(self, ordered_ids: list[str]) -> list[FriendLinks]:
        updated = []
        for sort_order, link_id in enumerate(ordered_ids):
            link = await self.get_link(link_id)
            if link:
                await link.update({"$set": {"sort_order": sort_order}})
                await link.sync()
                updated.append(link)
        return updated
