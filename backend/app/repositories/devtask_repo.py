from datetime import UTC, datetime

from beanie import PydanticObjectId

from app.models.beanie import DevTask


class DevTaskRepo:
    """DevTask repository using Beanie"""

    async def get_tasks(self, user_id: int) -> list[DevTask]:
        return (
            await DevTask.find(DevTask.user_id == user_id)
            .sort(+DevTask.sort_order)  # pyright: ignore[reportArgumentType]
            .to_list()
        )  # pyright: ignore[reportArgumentType]

    async def get_all_tasks(self) -> list[DevTask]:
        return (
            await DevTask.find()
            .sort(+DevTask.status, +DevTask.sort_order)  # pyright: ignore[reportOperatorIssue, reportArgumentType]
            .to_list()
        )  # pyright: ignore[reportArgumentType]

    async def create_task(self, user_id: int, task_data: dict) -> DevTask:
        task = DevTask(user_id=user_id, **task_data)
        await task.insert()
        return task

    async def update_task(
        self, user_id: int, task_id: str, update_data: dict
    ) -> DevTask | None:
        try:
            obj_id = PydanticObjectId(task_id)
        except Exception:
            return None

        task = await DevTask.find_one(
            DevTask.id == obj_id, DevTask.user_id == user_id
        )
        if not task:
            return None

        update_query = {"$set": {}}
        for k, v in update_data.items():
            if v is not None:
                update_query["$set"][k] = v

        update_query["$set"]["updated_at"] = datetime.now(UTC)

        await task.update(update_query)
        # Reload the task to return updated data
        await task.sync()
        return task

    async def reorder_tasks(
        self, user_id: int, status: str, ordered_ids: list[str]
    ) -> list[DevTask]:
        updated = []
        for sort_order, task_id in enumerate(ordered_ids):
            try:
                obj_id = PydanticObjectId(task_id)
            except Exception:
                continue
            task = await DevTask.find_one(
                DevTask.id == obj_id,
                DevTask.user_id == user_id,
                DevTask.status == status,
            )
            if task:
                await task.update(
                    {
                        "$set": {
                            "sort_order": sort_order + 1,
                            "updated_at": datetime.now(UTC),
                        }
                    }
                )
                await task.sync()
                updated.append(task)
        return updated

    async def delete_task(self, user_id: int, task_id: str) -> bool:
        try:
            obj_id = PydanticObjectId(task_id)
        except Exception:
            return False

        task = await DevTask.find_one(
            DevTask.id == obj_id, DevTask.user_id == user_id
        )
        if not task:
            return False

        await task.delete()
        return True
