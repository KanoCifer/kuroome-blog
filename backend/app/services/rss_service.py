from __future__ import annotations

import asyncio
import ipaddress
import socket
from datetime import UTC, datetime
from typing import Any

import feedparser
import httpx
from beanie.operators import In
from bson import ObjectId
from bson.errors import InvalidId

from app.core.logger import logger
from app.models.beanie import RssArticle, RssArticleGuidProjection
from app.models.models import RssInfo
from app.repositories.rss_repo import RssRepo
from app.schemas.rss import (
    RssArticleListResponse,
    RssArticleResponse,
    RssSubscriptionResponse,
)

# ======= RSS 相关工具函数 =======


def _parse_feed_published_datetime(
    feed: feedparser.FeedParserDict,
) -> datetime | None:
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
    # 安全获取发布时间，兼容不同字段名
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


class RssDomainError(Exception):
    def __init__(self, message: str, code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class RssService:
    """RSS 相关的业务逻辑处理类，负责处理 RSS 文章的相关操作。"""

    def __init__(self, repo: RssRepo):
        self.repo = repo

    async def save_rss_info(self, url: str, user_id: int) -> RssInfo:
        """保存 RSS 信息到数据库中。"""
        if await self.repo.check_rssurl_exists(url, user_id):
            raise RssDomainError("RSS URL already exists for this user", 409)
        rss_info = await self.repo.save_rss_url(url, user_id)
        return rss_info

    async def fetch_and_parse_feed(
        self,
        url: str,
        save_to_db: bool = False,
        rss_info: RssInfo | None = None,
    ) -> dict[str, Any]:
        """异步获取 RSS feed 内容并解析，返回解析结果和 feed meta 信息。"""
        try:
            # 异步获取feed内容，带超时控制
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0), follow_redirects=True
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
        except httpx.HTTPError as exc:
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

            await self.repo.save_rss_info(rss_info)

        return {
            "feed_meta": feed_meta,
            "entries": entries,
        }

    async def get_user_rss_info(self, user_id: int) -> list[str]:
        """获取用户订阅的 RSS 列表。"""
        return await self.repo.get_user_rss_info(user_id)

    async def get_articles_for_user(
        self,
        user_id: int,
        page: int,
        limit: int,
        feed_url: str | None = None,
        search: str | None = None,
    ) -> RssArticleListResponse:
        user_feed_urls = await self.get_user_rss_info(user_id)
        if not user_feed_urls:
            return RssArticleListResponse(
                items=[],
                total=0,
                page=page,
                limit=limit,
            )

        if feed_url is not None:
            if feed_url not in user_feed_urls:
                return RssArticleListResponse(
                    items=[],
                    total=0,
                    page=page,
                    limit=limit,
                )
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
        article_id: str,
        user_id: int,
    ) -> RssArticleResponse:
        try:
            oid = ObjectId(article_id)
        except (InvalidId, ValueError) as exc:
            raise RssDomainError("文章不存在 文章ID错误", 404) from exc

        article = await RssArticle.find_one(RssArticle.id == oid)
        if article is None:
            raise RssDomainError("文章不存在", 404)

        is_allowed = await self.repo.is_user_subscribed_to_feed(
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
        user_id: int,
    ) -> list[RssSubscriptionResponse]:
        subscriptions = await self.repo.get_user_subscriptions(user_id)
        return [
            RssSubscriptionResponse.model_validate(sub)
            for sub in subscriptions
        ]

    async def refresh_subscription(
        self,
        subscription_id: int,
        user_id: int,
    ) -> dict[str, Any]:
        rss_info = await self._get_owned_subscription(
            subscription_id=subscription_id,
            user_id=user_id,
        )

        result = await self.fetch_and_parse_feed(
            url=rss_info.rss_url,
            save_to_db=True,
            rss_info=rss_info,
        )

        entries = result["entries"]
        saved_count = await self._save_entries_to_mongo(
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
        subscription_id: int,
        user_id: int,
    ) -> str:
        rss_info = await self._get_owned_subscription(
            subscription_id=subscription_id,
            user_id=user_id,
        )
        return rss_info.rss_url

    async def delete_subscription_for_user(
        self,
        subscription_id: int,
        user_id: int,
    ) -> str:
        rss_info = await self._get_owned_subscription(
            subscription_id=subscription_id,
            user_id=user_id,
        )
        await RssArticle.find(RssArticle.feed_url == rss_info.rss_url).delete()
        await self.repo.delete_subscription(rss_info)
        return rss_info.rss_url

    async def mark_article_read_state(
        self,
        article_id: str,
        user_id: int,
        read: bool,
    ) -> None:
        try:
            oid = ObjectId(article_id)
        except (InvalidId, ValueError) as exc:
            raise RssDomainError("文章不存在", 404) from exc

        article = await RssArticle.find_one(RssArticle.id == oid)
        if article is None:
            raise RssDomainError("文章不存在", 404)

        is_allowed = await self.repo.is_user_subscribed_to_feed(
            user_id=user_id,
            feed_url=article.feed_url,
        )
        if not is_allowed:
            raise RssDomainError("文章不存在", 404)

        if read:
            if user_id not in article.read_by:
                article.read_by.append(user_id)
        else:
            article.read_by = [
                uid for uid in article.read_by if uid != user_id
            ]
        await article.save()

    async def save_entries_to_mongo(
        self,
        feed_url: str,
        entries: list[dict[str, Any]],
    ) -> int:
        return await self._save_entries_to_mongo(
            feed_url=feed_url,
            entries=entries,
        )

    async def _get_owned_subscription(
        self,
        subscription_id: int,
        user_id: int,
    ) -> RssInfo:
        rss_info = await self.repo.get_subscription_by_id(subscription_id)
        if rss_info is None:
            raise RssDomainError("订阅不存在", 404)
        if rss_info.user_id != user_id:
            raise RssDomainError("无权限操作此订阅", 403)
        return rss_info

    async def _save_entries_to_mongo(
        self,
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
            content = _extract_entry_content(entry)
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
                    published=_parse_entry_published_datetime(entry),
                    fetched_at=fetched_at,
                    read_by=[],
                )
            )

        if not new_articles:
            return 0

        try:
            await RssArticle.insert_many(new_articles)
            return len(new_articles)
        except Exception as exc:
            logger.error(
                "同步写入 RSS 文章失败: feed_url=%s, error=%r",
                feed_url,
                exc,
            )
            raise RssDomainError("保存 RSS 文章失败", 500) from exc
