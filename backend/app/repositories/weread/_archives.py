from app.models.weread import Archive


class ArchiveRepo:
    """Archive CRUD"""

    async def save_user_archives_bulk(
        self, archives: list[Archive]
    ) -> list[Archive]:
        """批量保存用户书单，按 (user_id, name) 去重"""
        if not archives:
            return []

        conditions = [{"user_id": a.user_id, "name": a.name} for a in archives]
        existing = await Archive.find({"$or": conditions}).to_list()
        existing_map = {(a.user_id, a.name): a for a in existing}

        new_archives = []
        updated = []
        for archive in archives:
            if (archive.user_id, archive.name) in existing_map:
                doc = existing_map[(archive.user_id, archive.name)]
                doc.bookIds = archive.bookIds
                await doc.save()
                updated.append(doc)
            else:
                new_archives.append(archive)

        if new_archives:
            await Archive.insert_many(new_archives)
        return updated + new_archives

    async def save_user_archive(self, archive_info) -> Archive:
        """保存用户书单信息"""
        archive = Archive(**archive_info)
        find_one = Archive.find_one(
            (Archive.user_id == archive.user_id)
            & (Archive.name == archive.name)
        )
        existing = await find_one
        if existing:
            archive.id = existing.id
            await archive.save()
        else:
            await archive.insert()
        return archive
