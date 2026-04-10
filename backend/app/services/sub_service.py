from app.models.models import Subscription
from app.repositories.sub_repo import SubRepo


class SubService:
    def __init__(self, repo: SubRepo) -> None:
        self.sub_repo = repo

    async def get_all_subscriptions(self, user_id: int):
        return await self.sub_repo.get_all_subscriptions(user_id)

    async def get_subscription_by_id(self, sub_id: int) -> Subscription | None:
        return await self.sub_repo.get_subscription_by_id(sub_id)

    async def create_one_subscription(self, user_id: int, **sub_data):
        return await self.sub_repo.create_one_subscription(user_id, **sub_data)

    async def update_subscription(self, sub_id: int, **update_data):
        return await self.sub_repo.update_subscription(sub_id, **update_data)

    async def delete_subscription(self, sub_id: int):
        return await self.sub_repo.delete_subscription(sub_id)

    async def update_status(self, sub_id: int, new_status: str):
        return await self.sub_repo.update_status(sub_id, new_status)

    async def get_subscription_logs(
        self, user_id: int | None = None, sub_id: int | None = None
    ):
        return await self.sub_repo.get_subscription_logs(user_id, sub_id)

    async def update_reminder_config(self, sub_id: int, config_data: dict):
        return await self.sub_repo.update_reminder_config(sub_id, config_data)

    async def get_due_subscriptions(self):
        return await self.sub_repo.get_due_subscriptions()

    async def get_user_global_reminder_config(self, user_id: int):
        return await self.sub_repo.get_global_notification_config(user_id)

    async def update_user_global_reminder_config(
        self, user_id: int, config_data: dict
    ):
        return await self.sub_repo.update_global_notification_config(
            user_id, config_data
        )
