from datetime import UTC, datetime

from beanie import PydanticObjectId, SortDirection

from app.models.moment import Moment, MomentStatus, MomentVisibility


class MomentRepo:
    """Moment repository using Beanie."""

    @staticmethod
    def _object_id(moment_id: str) -> PydanticObjectId | None:
        try:
            return PydanticObjectId(moment_id)
        except Exception:
            return None

    async def list_public_moments(
        self,
        *,
        page: int,
        page_size: int,
        tag: str | None = None,
    ) -> tuple[list[Moment], int]:
        query = {
            "visibility": MomentVisibility.PUBLIC,
            "status": MomentStatus.PUBLISHED,
            "deleted_at": None,
        }
        if tag:
            query["tags"] = tag

        skip = (page - 1) * page_size
        cursor = Moment.find(query)
        total = await cursor.count()
        moments = await (
            cursor.sort(
                [
                    ("is_pinned", SortDirection.DESCENDING),
                    ("published_at", SortDirection.DESCENDING),
                    ("created_at", SortDirection.DESCENDING),
                ]
            )
            .skip(skip)
            .limit(page_size)
            .to_list()
        )
        return moments, total

    async def list_admin_moments(
        self,
        *,
        page: int,
        page_size: int,
        status: MomentStatus | None = None,
    ) -> tuple[list[Moment], int]:
        query: dict = {"deleted_at": None}
        if status:
            query["status"] = status

        skip = (page - 1) * page_size
        cursor = Moment.find(query)
        total = await cursor.count()
        moments = await (
            cursor.sort(
                [
                    ("is_pinned", SortDirection.DESCENDING),
                    ("updated_at", SortDirection.DESCENDING),
                ]
            )
            .skip(skip)
            .limit(page_size)
            .to_list()
        )
        return moments, total

    async def get_public_moment(self, moment_id: str) -> Moment | None:
        obj_id = self._object_id(moment_id)
        if obj_id is None:
            return None
        return await Moment.find_one(
            {
                "_id": obj_id,
                "visibility": {
                    "$in": [
                        MomentVisibility.PUBLIC,
                        MomentVisibility.UNLISTED,
                    ]
                },
                "status": MomentStatus.PUBLISHED,
                "deleted_at": None,
            }
        )

    async def get_admin_moment(self, moment_id: str) -> Moment | None:
        obj_id = self._object_id(moment_id)
        if obj_id is None:
            return None
        return await Moment.find_one(Moment.id == obj_id, Moment.deleted_at == None)  # noqa: E711

    async def create_moment(self, user_id: int, data: dict) -> Moment:
        now = datetime.now(UTC)
        if data.get("status") == MomentStatus.PUBLISHED and not data.get(
            "published_at"
        ):
            data["published_at"] = now
        moment = Moment(user_id=user_id, **data)
        await moment.insert()
        return moment

    async def update_moment(self, moment_id: str, data: dict) -> Moment | None:
        moment = await self.get_admin_moment(moment_id)
        if not moment:
            return None

        now = datetime.now(UTC)
        update_data = {k: v for k, v in data.items() if v is not None}
        if (
            update_data.get("status") == MomentStatus.PUBLISHED
            and not update_data.get("published_at")
            and not moment.published_at
        ):
            update_data["published_at"] = now
        update_data["updated_at"] = now

        await moment.update({"$set": update_data})
        await moment.sync()
        return moment

    async def delete_moment(self, moment_id: str) -> bool:
        moment = await self.get_admin_moment(moment_id)
        if not moment:
            return False
        await moment.update(
            {
                "$set": {
                    "deleted_at": datetime.now(UTC),
                    "updated_at": datetime.now(UTC),
                }
            }
        )
        return True
