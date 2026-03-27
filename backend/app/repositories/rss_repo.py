from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import RssInfo


class RssRepo:
    """RSS 相关的数据库操作类，负责与数据库进行交互以管理 RSS 文章数据。"""

    def __init__(self, session: AsyncSession):
        """获取异步数据库会话实例，并在后续方法中使用该会话进行数据库操作。"""
        self.session: AsyncSession = session

    async def check_rssurl_exists(self, url: str, user_id: int) -> bool:
        """检查 RSS URL 是否已存在于数据库中。"""
        result = await self.session.execute(
            select(RssInfo).where(
                (RssInfo.user_id == user_id) & (RssInfo.rss_url == url)
            )
        )

        return bool(result.scalar_one_or_none())

    async def get_subscription_by_id(
        self, subscription_id: int
    ) -> RssInfo | None:
        """按订阅 ID 获取订阅记录。"""
        result = await self.session.execute(
            select(RssInfo).where(RssInfo.id == subscription_id)
        )
        return result.scalar_one_or_none()

    async def get_user_subscriptions(self, user_id: int) -> list[RssInfo]:
        """获取用户全部订阅记录。"""
        result = await self.session.execute(
            select(RssInfo).where(RssInfo.user_id == user_id)
        )
        return list(result.scalars().all())

    async def is_user_subscribed_to_feed(
        self, user_id: int, feed_url: str
    ) -> bool:
        """检查用户是否订阅了指定 feed。"""
        result = await self.session.execute(
            select(RssInfo).where(
                RssInfo.user_id == user_id,
                RssInfo.rss_url == feed_url,
            )
        )
        return result.scalar_one_or_none() is not None

    async def save_rss_url(self, url: str, user_id: int) -> RssInfo:
        """将 RSS URL 保存到数据库中。"""
        rss_info = RssInfo(user_id=user_id, rss_url=url)
        self.session.add(rss_info)
        await self.session.flush()
        return rss_info

    async def save_rss_info(self, rss_info: RssInfo) -> None:
        """将 RSS 信息保存到数据库中。"""
        self.session.add(rss_info)

    async def get_user_rss_info(self, user_id: int) -> list[str]:
        """获取用户订阅的 RSS 列表。"""
        result = await self.session.execute(
            select(RssInfo).where(RssInfo.user_id == user_id)
        )

        subscriptions = result.scalars().all()
        return [sub.rss_url for sub in subscriptions]

    async def delete_subscription(self, rss_info: RssInfo) -> None:
        """删除订阅记录。"""
        await self.session.delete(rss_info)

    async def get_all_rss_urls(self) -> list[str]:
        """获取所有 RSS 源 URL（去重）。"""
        result = await self.session.execute(select(RssInfo.rss_url).distinct())
        return list(result.scalars().all())
