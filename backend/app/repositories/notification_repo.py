from sqlalchemy import select

from app.models.models import Subscription


class NotificationRepo:
    def __init__(self, session):
        self.session = session

    async def get_subscription_by_user(self, user_id):
        """获取用户的订阅"""
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_all_subscriptions_orm(self):
        """获取所有订阅"""
        stmt = select(Subscription)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_all_active_subscriptions(self):
        """获取所有活跃订阅"""
        stmt = select(Subscription).where(Subscription.status == "active")
        result = await self.session.execute(stmt)
        return result.scalars().all()
