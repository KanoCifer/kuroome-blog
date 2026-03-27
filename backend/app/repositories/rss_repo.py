from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from beanie.operators import In
from bson import ObjectId
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.beanie import RssArticle, RssArticleGuidProjection
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

    async def list_articles_for_user(
        self,
        *,
        user_feed_urls: list[str],
        page: int,
        limit: int,
        feed_url: str | None = None,
        search: str | None = None,
    ) -> tuple[list[RssArticle], int]:
        if not user_feed_urls:
            return [], 0

        if feed_url is not None:
            if feed_url not in user_feed_urls:
                return [], 0
            query = RssArticle.find(RssArticle.feed_url == feed_url)
        else:
            query = RssArticle.find(In(RssArticle.feed_url, user_feed_urls))

        if search is not None:
            query = query.find({"$text": {"$search": search}})
            sort_criteria = [
                ("score", {"$meta": "textScore"}),
                "-published",
                "-fetched_at",
            ]
        else:
            sort_criteria = ["-published", "-fetched_at"]

        total = await query.count()
        skip = (page - 1) * limit
        articles = (
            await query.sort(*sort_criteria).skip(skip).limit(limit).to_list()
        )
        return articles, total

    async def get_article_by_id(
        self,
        oid: ObjectId,
    ) -> RssArticle | None:
        return await RssArticle.find_one(RssArticle.id == oid)

    async def delete_articles_by_feed_url(self, feed_url: str) -> None:
        await RssArticle.find(RssArticle.feed_url == feed_url).delete()

    async def update_article_read_state(
        self,
        *,
        oid: ObjectId,
        user_id: int,
        read: bool,
    ) -> None:
        if read:
            await RssArticle.find_one(RssArticle.id == oid).update(
                {"$addToSet": {"read_by": user_id}}
            )  # type: ignore
        else:
            await RssArticle.find_one(RssArticle.id == oid).update(
                {"$pull": {"read_by": user_id}}
            )  # type: ignore

    async def save_entries_to_mongo(
        self,
        *,
        feed_url: str,
        entries: list[dict[str, Any]],
    ) -> int:
        entries_map: dict[str, dict[str, Any]] = {}
        guids: list[str] = []

        for entry in entries:
            guid = str(entry.get("id") or entry.get("link", ""))
            if not guid:
                continue
            guids.append(guid)
            entries_map[guid] = entry

        if not guids:
            return 0

        existing_articles = (
            await RssArticle.find(
                RssArticle.feed_url == feed_url,
                In(RssArticle.guid, guids),
            )
            .project(RssArticleGuidProjection)
            .to_list()
        )
        existing_guids = {article.guid for article in existing_articles}

        fetched_at = datetime.now(UTC)
        new_articles: list[RssArticle] = []
        for guid in guids:
            if guid in existing_guids:
                continue

            entry = entries_map[guid]
            summary = str(entry.get("summary", ""))
            content = self._extract_entry_content(entry)
            raw_author = entry.get("author")
            author = str(raw_author) if raw_author is not None else None

            new_articles.append(
                RssArticle(
                    guid=guid,
                    feed_url=feed_url,
                    title=str(entry.get("title", "")),
                    link=str(entry.get("link", "")),
                    summary=summary,
                    content=content or summary,
                    author=author,
                    published=self._parse_entry_published_datetime(entry),
                    fetched_at=fetched_at,
                    read_by=[],
                )
            )

        if not new_articles:
            return 0

        await RssArticle.insert_many(new_articles)
        return len(new_articles)

    @staticmethod
    def _parse_entry_published_datetime(
        entry: dict[str, Any],
    ) -> datetime | None:
        for field in ("published_parsed", "updated_parsed"):
            parsed = entry.get(field)
            if not parsed:
                continue
            try:
                normalized = [int(x) for x in parsed[:6]]
                return datetime(*normalized, tzinfo=UTC)
            except Exception:
                continue
        return None

    @staticmethod
    def _extract_entry_content(entry: dict[str, Any]) -> str:
        raw_content = entry.get("content")
        if isinstance(raw_content, list) and raw_content:
            first = raw_content[0]
            if isinstance(first, dict):
                return str(first.get("value", ""))
        if isinstance(raw_content, str):
            return raw_content
        return str(entry.get("summary", ""))
