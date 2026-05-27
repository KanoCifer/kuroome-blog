from datetime import UTC, datetime

from app.models.models import Subscription
from app.repositories.sub_repo import SubRepo
from app.services.base import BaseService


class SubService(BaseService):
    def __init__(self, repo: SubRepo) -> None:
        self.sub_repo = repo

    async def get_owned_subscription(
        self, sub_id: int, user_id: int
    ) -> Subscription:
        """Return subscription if found and owned, otherwise raise."""
        sub = await self.sub_repo.get_subscription_by_id(sub_id)
        return self.get_owned(sub, user_id, "订阅不存在", "无权访问此订阅")

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
        """Return active subscriptions past their billing date.

        The "due" rule — active AND next_billing_date <= now — lives here
        in the service layer, not in the repo.
        """
        active_subs = await self.sub_repo.get_active_subscriptions()
        now = datetime.now(UTC)
        return [s for s in active_subs if s.next_billing_date <= now]

    async def get_user_global_reminder_config(self, user_id: int):
        return await self.sub_repo.get_global_notification_config(user_id)

    async def update_user_global_reminder_config(
        self, user_id: int, config_data: dict
    ):
        return await self.sub_repo.update_global_notification_config(
            user_id, config_data
        )
