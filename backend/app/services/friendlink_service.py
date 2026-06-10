from __future__ import annotations

from app.models.friendlink import FriendLinks
from app.repositories.friendlink_repo import FriendLinkRepo


class FriendLinkService:
    def __init__(self, repo: FriendLinkRepo) -> None:
        self.repo = repo

    async def get_links(self) -> list[FriendLinks]:
        return await self.repo.get_links()

    async def get_link(self, link_id: str) -> FriendLinks | None:
        return await self.repo.get_link(link_id)

    async def create_link(self, data: dict) -> FriendLinks:
        latest = await self.repo.get_latest_sort_order()
        link = FriendLinks(**data, sort_order=latest + 1)
        return await self.repo.create_link(link)

    async def update_link(self, link_id: str, data: dict) -> FriendLinks:
        link = await self.repo.get_link(link_id)
        if not link:
            raise ValueError("Friend link not found")
        return await self.repo.update_link(link, data)

    async def delete_link(self, link_id: str) -> None:
        link = await self.repo.get_link(link_id)
        if not link:
            raise ValueError("Friend link not found")
        await self.repo.delete_link(link)

    async def reorder_links(self, ordered_ids: list[str]) -> list[FriendLinks]:
        updated = []
        for sort_order, link_id in enumerate(ordered_ids):
            link = await self.repo.get_link(link_id)
            if link:
                await self.repo.update_link(link, {"sort_order": sort_order})
                updated.append(link)
        return updated
