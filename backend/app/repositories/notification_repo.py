from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Subscription


class NotificationRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get_subscription_by_user(
        self, user_id: int
    ) -> list[Subscription]:
        """获取用户的订阅"""
        stmt = select(Subscription).where(Subscription.user_id == user_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_subscriptions_orm(self) -> list[Subscription]:
        """获取所有订阅"""
        stmt = select(Subscription)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_active_subscriptions(self) -> list[Subscription]:
        """获取所有活跃订阅"""
        stmt = select(Subscription).where(Subscription.status == "active")
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
