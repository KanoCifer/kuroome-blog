from app.models.beanie import DevTask
from app.repositories.devtask_repo import DevTaskRepo


class DevTaskService:
    def __init__(self, repo: DevTaskRepo):
        self.repo = repo

    async def get_tasks(self, user_id: int) -> list[DevTask]:
        return await self.repo.get_tasks(user_id)

    async def get_all_tasks(self) -> list[DevTask]:
        return await self.repo.get_all_tasks()

    async def create_task(self, user_id: int, task_data: dict) -> DevTask:
        return await self.repo.create_task(user_id, task_data)

    async def update_task(
        self, user_id: int, task_id: str, update_data: dict
    ) -> DevTask:
        task = await self.repo.update_task(user_id, task_id, update_data)
        if not task:
            raise ValueError("Task not found")
        return task

    async def delete_task(self, user_id: int, task_id: str) -> bool:
        success = await self.repo.delete_task(user_id, task_id)
        if not success:
            raise ValueError("Task not found")
        return success

    async def reorder_tasks(
        self, user_id: int, status: str, ordered_ids: list[str]
    ) -> list[DevTask]:
        return await self.repo.reorder_tasks(user_id, status, ordered_ids)
