from app.notification.dispatcher import NotificationDispatcher
from app.repositories.notification_repo import NotificationRepo


class NotificationService:
    def __init__(
        self, dispatcher: NotificationDispatcher, repo: NotificationRepo
    ):
        self.dispatcher: NotificationDispatcher = dispatcher
        self.repo: NotificationRepo = repo

    async def get_all_subscriptions(self):
        return await self.repo.get_all_subscriptions_orm()

    async def get_all_active_subscriptions(self):
        """获取所有活跃订阅"""
        return await self.repo.get_all_active_subscriptions()

    async def get_subscription(self, user_id):
        return await self.repo.get_subscription_by_user(user_id)

    async def send_reminder(self, payload, config, user_id, channels):
        """发送提醒"""
        result: dict[str, bool] = await self.dispatcher.dispatch(
            payload=payload,
            reminder_config=config,
            user_id=user_id,
            channels=channels,
        )
        return result
