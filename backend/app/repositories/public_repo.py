from __future__ import annotations

from typing import Any

from app.models.changelog import Changelog


class PublicRepo:
    async def get_changelogs(self) -> list[Changelog]:
        """获取所有 changelog，按版本号降序排列。"""
        changelogs = await Changelog.find().sort("-version").to_list()  # pyright: ignore[reportGeneralTypeIssues]
        # logger.info(f"Fetched changelogs : {changelogs}")
        return changelogs

    async def get_changelog_by_version(self, version: str) -> Changelog | None:
        """根据版本号获取单条 changelog。"""
        return await Changelog.find_one(Changelog.version == version)  # pyright: ignore[reportGeneralTypeIssues]

    async def save_changelog(self, data: dict[str, Any]) -> Changelog:
        """保存或更新 changelog（按 version 去重）。"""
        existing = await self.get_changelog_by_version(data["version"])
        if existing:
            await existing.update({"$set": data})
            await existing.sync()
            return existing
        doc = Changelog(**data)
        await doc.insert()
        return doc

    async def save_changelogs(self, items: list[dict[str, Any]]) -> int:
        """批量保存 changelog，返回新增条数。"""
        count = 0
        for item in items:
            existing = await self.get_changelog_by_version(item["version"])
            if not existing:
                await Changelog(**item).insert()
                count += 1
        return count

    async def delete_changelog(self, version: str) -> bool:
        """根据版本号删除 changelog。"""
        doc = await self.get_changelog_by_version(version)
        if not doc:
            return False
        await doc.delete()
        return True
