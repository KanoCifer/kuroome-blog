from __future__ import annotations

import asyncio
import ipaddress
import socket
from datetime import UTC, datetime
from typing import Any

import feedparser
import httpx2
import orjson
from bson import ObjectId
from bson.errors import InvalidId
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import RssDomainError
from app.core.logger import logger
from app.models.models import RssInfo
from app.repositories.rss_repo import RssRepo
from app.schemas.rss import (
    RssArticleListResponse,
    RssArticleResponse,
    RssSubscriptionResponse,
)


def _parse_feed_published_datetime(
    feed: feedparser.FeedParserDict,
) -> datetime | None:
    """安全解析 feed 的发布时间，兼容不同字段名和格式。"""
    published_parsed = getattr(feed.feed, "published_parsed", None)
    updated_parsed = getattr(feed.feed, "updated_parsed", None)
    parsed_time = published_parsed or updated_parsed
    if not parsed_time:
        return None
    try:
        t = tuple(int(x) for x in parsed_time[:6])  # type: ignore[index]
        return datetime(*t, tzinfo=UTC)
    except Exception:
        return None


def _build_feed_meta(feed: feedparser.FeedParserDict) -> dict[str, str | None]:
    """构建 feed 的元信息。"""
    published: str | None = None
    if hasattr(feed.feed, "published"):
        published = feed.feed.published  # type: ignore[attr-defined]
    elif hasattr(feed.feed, "updated"):
        published = feed.feed.updated  # type: ignore[attr-defined]
    elif hasattr(feed.feed, "pubDate"):
        published = feed.feed.pubDate  # type: ignore[attr-defined]

    return {
        "title": str(getattr(feed.feed, "title", "") or ""),
        "link": str(getattr(feed.feed, "link", "") or ""),
        "description": str(getattr(feed.feed, "description", "") or ""),
        "published": published,
    }


def _is_private_address(host: str) -> bool:
    """判断给定的主机地址是否属于私有地址范围，支持 IPv4 和 IPv6。"""
    try:
        ip = ipaddress.ip_address(host)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
        )
    except ValueError:
        return False


async def _is_forbidden_target(hostname: str) -> bool:
    """判断给定的主机名是否属于禁止访问的目标，主要用于防止 SSRF 攻击。禁止访问的目标包括：
    - 空主机名
    - 本地回环地址（localhost、127.0.0.1、::1）
    - 私有地址范围（如 192.168.0.0/16）
    - 以及通过 DNS 解析得到的任何私有地址"""
    host = hostname.strip().lower()
    if not host:
        return True
    if host in {"localhost", "127.0.0.1", "::1"}:
        return True
    if _is_private_address(host):
        return True

    try:
        addr_infos = await asyncio.to_thread(
            socket.getaddrinfo, host, None, type=socket.SOCK_STREAM
        )
    except OSError:
        # DNS 解析失败时交由下游请求报错
        return False

    for _, _, _, _, sockaddr in addr_infos:
        ip = sockaddr[0]
        if _is_private_address(host=str(ip)):
            return True
    return False


def _normalize_struct_time(value: Any) -> list[int] | None:
    """将 feedparser 解析得到的 struct_time 对象转换为标准的 datetime 参数列表，兼容不同字段名和格式。"""
    if value is None:
        return None
    try:
        return [int(x) for x in value[:6]]
    except Exception:
        return None


def _parse_entry_published_datetime(entry: dict[str, Any]) -> datetime | None:
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


def _extract_entry_content(entry: dict[str, Any]) -> str:
    raw_content = entry.get("content")
    if isinstance(raw_content, list) and raw_content:
        first = raw_content[0]
        if isinstance(first, dict):
            return str(first.get("value", ""))
    if isinstance(raw_content, str):
        return raw_content
    return str(entry.get("summary", ""))


# ======= RSS 业务逻辑处理类 =======


class RssService:
    """RSS 相关的业务逻辑处理类，负责处理 RSS 文章的相关操作。"""

    def __init__(
        self,
        repo: RssRepo,
        redis: AsyncRedis,
    ):
        self.repo: RssRepo = repo
        self.redis: AsyncRedis = redis

    @staticmethod
    def _build_rss_cache_key(url: str) -> str:
        return f"rss_cache:{url}"

    async def get_cached_feed(self, url: str) -> dict[str, Any] | None:
        redis = self.redis
        cached_data = await redis.get(self._build_rss_cache_key(url))
        if not cached_data:
            return None
        try:
            payload = orjson.loads(cached_data)
        except Exception:
            return None
        return payload if isinstance(payload, dict) else None

    async def set_cached_feed(
        self,
        *,
        url: str,
        feed_meta: dict[str, Any],
        entries: list[dict[str, Any]],
        ttl_seconds: int = 3600,
    ) -> None:
        payload = {"meta": feed_meta, "entries": entries}
        redis = self.redis
        await redis.set(
            self._build_rss_cache_key(url),
            orjson.dumps(payload),
            ex=ttl_seconds,
        )

    async def invalidate_feed_cache(self, url: str) -> None:
        redis = self.redis
        await redis.delete(self._build_rss_cache_key(url))

    async def save_rss_info(
        self, session: AsyncSession, url: str, user_id: int,
    ) -> RssInfo:
        """保存 RSS 信息到数据库中。"""
        repo = self.repo
        if await repo.check_rssurl_exists(session, url, user_id):
            raise RssDomainError("RSS URL already exists for this user", 409)
        rss_info = await repo.save_rss_url(session, url, user_id)
        return rss_info

    async def fetch_and_parse_feed(
        self,
        session: AsyncSession,
        url: str,
        save_to_db: bool = False,
        rss_info: RssInfo | None = None,
    ) -> dict[str, Any]:
        try:
            # 异步获取feed内容，带超时控制
            async with httpx2.AsyncClient(
                timeout=httpx2.Timeout(10.0, connect=5.0),
                follow_redirects=True,
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                content = resp.content

            loop = asyncio.get_running_loop()
            feed: feedparser.FeedParserDict = await loop.run_in_executor(
                None, feedparser.parse, content
            )

            if feed.bozo != 0:
                raise RssDomainError(
                    f"Failed to parse feed: {feed.bozo_exception!s}",
                    400,
                )

            feed_meta = _build_feed_meta(feed)
            feed_published_at = _parse_feed_published_datetime(feed)
        except httpx2.HTTPError as exc:
            raise RssDomainError(f"Failed to fetch feed: {exc}", 502) from exc
        except RssDomainError:
            raise
        except Exception as exc:
            raise RssDomainError(
                f"Unexpected error during feed fetch/parse: {exc}",
                500,
            ) from exc
        # 解析RSS条目
        entries: list[dict[str, Any]] = []
        for entry in feed.entries:
            published_parsed = _normalize_struct_time(
                entry.get("published_parsed")
            )
            updated_parsed = _normalize_struct_time(
                entry.get("updated_parsed")
            )
            entries.append(
                {
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published")
                    or entry.get("updated"),
                    "summary": entry.get("summary", ""),
                    "content": _extract_entry_content(entry),
                    "id": str(entry.get("id") or entry.get("link", "") or ""),
                    "author": entry.get("author"),
                    "published_parsed": published_parsed,
                    "updated_parsed": updated_parsed,
                }
            )

        fetched_at = datetime.now(UTC)
        if save_to_db and rss_info is not None:
            rss_info.feed_title = feed_meta.get("title") or None
            rss_info.feed_link = feed_meta.get("link") or None
            rss_info.feed_description = feed_meta.get("description") or None
            rss_info.feed_published_at = feed_published_at
            rss_info.entry_count = len(entries)
            rss_info.last_fetched_at = fetched_at

            repo = self.repo
            await repo.save_rss_info(session, rss_info)

        return {
            "feed_meta": feed_meta,
            "entries": entries,
        }

    async def get_user_rss_info(
        self, session: AsyncSession, user_id: int,
    ) -> list[str]:
        """获取用户订阅的 RSS 列表。"""
        repo = self.repo
        return await repo.get_user_rss_info(session, user_id)

    async def get_articles_for_user(
        self,
        session: AsyncSession,
        user_id: int,
        page: int,
        limit: int,
        feed_url: str | None = None,
        search: str | None = None,
    ) -> RssArticleListResponse:
        user_feed_urls = await self.get_user_rss_info(session, user_id)
        articles, total = await self.repo.list_articles_for_user(
            session,
            user_feed_urls=user_feed_urls,
            page=page,
            limit=limit,
            feed_url=feed_url,
            search=search,
        )

        items = [
            RssArticleResponse(
                id=str(article.id),
                guid=article.guid,
                feed_url=article.feed_url,
                title=article.title,
                link=article.link,
                summary=article.summary,
                content=article.content,
                author=article.author,
                published=article.published,
                fetched_at=article.fetched_at,
                is_read=user_id in article.read_by,
            )
            for article in articles
        ]

        return RssArticleListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
        )

    async def get_article_for_user(
        self,
        session: AsyncSession,
        article_id: str,
        user_id: int,
    ) -> RssArticleResponse:
        try:
            oid = ObjectId(article_id)
        except (InvalidId, ValueError) as exc:
            raise RssDomainError("文章不存在 文章ID错误", 404) from exc

        article = await self.repo.get_article_by_id(session, oid)
        if article is None:
            raise RssDomainError("文章不存在", 404)

        repo = self.repo
        is_allowed = await repo.is_user_subscribed_to_feed(
            session,
            user_id=user_id,
            feed_url=article.feed_url,
        )
        if not is_allowed:
            raise RssDomainError("文章不存在", 404)

        return RssArticleResponse(
            id=str(article.id),
            guid=article.guid,
            feed_url=article.feed_url,
            title=article.title,
            link=article.link,
            summary=article.summary,
            content=article.content,
            author=article.author,
            published=article.published,
            fetched_at=article.fetched_at,
            is_read=user_id in article.read_by,
        )

    async def get_subscriptions_for_user(
        self,
        session: AsyncSession,
        user_id: int,
    ) -> list[RssSubscriptionResponse]:
        repo = self.repo
        subscriptions = await repo.get_user_subscriptions(session, user_id)
        return [
            RssSubscriptionResponse.model_validate(sub)
            for sub in subscriptions
        ]

    async def get_all_rss_urls(
        self, session: AsyncSession,
    ) -> list[str]:
        repo = self.repo
        return await repo.get_all_rss_urls(session)

    async def refresh_all_feeds(
        self, session: AsyncSession,
    ) -> dict[str, int]:
        feed_urls = await self.get_all_rss_urls(session)
        if not feed_urls:
            return {
                "total_feeds": 0,
                "success": 0,
                "failed": 0,
                "new_articles": 0,
            }

        semaphore = asyncio.Semaphore(5)
        success_count = 0
        failed_count = 0
        total_saved = 0

        async def _refresh_one(feed_url: str) -> int:
            nonlocal success_count, failed_count
            async with semaphore:
                try:
                    result = await self.fetch_and_parse_feed(
                        session, url=feed_url,
                    )
                    saved = await self._save_entries_to_mongo(
                        session,
                        feed_url=feed_url,
                        entries=result["entries"],
                    )
                    success_count += 1
                    return saved
                except Exception:
                    failed_count += 1
                    return 0

        results = await asyncio.gather(
            *[_refresh_one(url) for url in feed_urls]
        )
        total_saved = sum(results)

        logger.info(
            "[RSSRefreshJob] total=%d, success=%d, failed=%d, new=%d",
            len(feed_urls),
            success_count,
            failed_count,
            total_saved,
        )

        return {
            "total_feeds": len(feed_urls),
            "success": success_count,
            "failed": failed_count,
            "new_articles": total_saved,
        }

    async def refresh_subscription(
        self,
        session: AsyncSession,
        subscription_id: int,
        user_id: int,
    ) -> dict[str, Any]:
        """刷新用户的 RSS 订阅，重新获取和解析 feed 内容，并保存新的文章到数据库中。返回刷新结果和统计信息。"""
        rss_info = await self._get_owned_subscription(
            session,
            subscription_id=subscription_id,
            user_id=user_id,
        )
        await self.invalidate_feed_cache(rss_info.rss_url)

        result = await self.fetch_and_parse_feed(
            session,
            url=rss_info.rss_url,
            save_to_db=True,
            rss_info=rss_info,
        )

        entries = result["entries"]
        saved_count = await self._save_entries_to_mongo(
            session,
            feed_url=rss_info.rss_url,
            entries=entries,
        )

        return {
            "subscription_id": subscription_id,
            "rss_url": rss_info.rss_url,
            "saved_count": saved_count,
        }

    async def get_subscription_url_for_user(
        self,
        session: AsyncSession,
        subscription_id: int,
        user_id: int,
    ) -> str:
        """获取用户的 RSS 订阅 URL，确保用户有权限访问该订阅。"""
        rss_info = await self._get_owned_subscription(
            session,
            subscription_id=subscription_id,
            user_id=user_id,
        )
        return rss_info.rss_url

    async def delete_subscription_for_user(
        self,
        session: AsyncSession,
        subscription_id: int,
        user_id: int,
    ) -> str:
        rss_info = await self._get_owned_subscription(
            session,
            subscription_id=subscription_id,
            user_id=user_id,
        )
        await self.repo.delete_articles_by_feed_url(
            session, rss_info.rss_url,
        )
        await self.repo.delete_subscription(session, rss_info)
        return rss_info.rss_url

    async def mark_article_read_state(
        self,
        session: AsyncSession,
        article_id: str,
        user_id: int,
        read: bool,
    ) -> None:
        try:
            oid = ObjectId(article_id)
        except (InvalidId, ValueError) as exc:
            raise RssDomainError("文章不存在", 404) from exc

        await self.repo.update_article_read_state(
            session,
            oid=oid,
            user_id=user_id,
            read=read,
        )

    async def save_entries_to_mongo(
        self,
        session: AsyncSession,
        feed_url: str,
        entries: list[dict[str, Any]],
    ) -> int:
        return await self._save_entries_to_mongo(
            session,
            feed_url=feed_url,
            entries=entries,
        )

    async def _get_owned_subscription(
        self,
        session: AsyncSession,
        subscription_id: int,
        user_id: int,
    ) -> RssInfo:
        """获取用户拥有的 RSS 订阅信息，确保订阅存在且属于该用户。"""
        rss_info = await self.repo.get_subscription_by_id(
            session, subscription_id,
        )
        if rss_info is None:
            raise RssDomainError("订阅不存在", 404)
        if rss_info.user_id != user_id:
            raise RssDomainError("无权限操作此订阅", 403)
        return rss_info

    async def _save_entries_to_mongo(
        self,
        session: AsyncSession,
        feed_url: str,
        entries: list[dict[str, Any]],
    ) -> int:
        try:
            return await self.repo.save_entries_to_mongo(
                session,
                feed_url=feed_url,
                entries=entries,
            )
        except Exception as exc:
            logger.error(
                "同步写入 RSS 文章失败: feed_url=%s, error=%r",
                feed_url,
                exc,
            )
            raise RssDomainError("保存 RSS 文章失败", 500) from exc
