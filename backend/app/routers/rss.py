import ipaddress
import json
import socket
from datetime import UTC, datetime
from urllib.parse import urlparse

import feedparser
import httpx
from beanie.operators import In
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.configs.logger import logger
from app.dependencies.auth import manager
from app.dependencies.database import get_session
from app.dependencies.redis import AsyncRedis, get_async_redis
from app.models.mgmodel import RssArticle
from app.models.models import RssInfo, User
from app.schemas.response import APIResponse
from app.schemas.schemas import (
    RssArticleListResponse,
    RssArticleResponse,
    RssSubscriptionResponse,
)

router = APIRouter(prefix="/rss", tags=["rss"])
_IMAGE_PROXY_TIMEOUT = httpx.Timeout(15.0, connect=10.0)
_IMAGE_PROXY_MAX_BYTES = 10 * 1024 * 1024  # 10MB


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


def _is_forbidden_target(hostname: str) -> bool:
    host = hostname.strip().lower()
    if not host:
        return True
    if host in {"localhost", "127.0.0.1", "::1"}:
        return True
    if _is_private_address(host):
        return True

    try:
        addr_infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except OSError:
        # DNS 解析失败时交由下游请求报错
        return False

    for _, _, _, _, sockaddr in addr_infos:
        ip = sockaddr[0]
        if _is_private_address(host=str(ip)):
            return True
    return False


async def save_to_mongo(feed_url: str, entries: list, user_id: int):
    """
    Background task: Save RSS entries to MongoDB.

    Args:
        feed_url: The RSS feed URL
        entries: List of entry dicts with title, link, published, summary, content
        user_id: The user ID (currently not directly stored in RssArticle, but for logging)
    """
    saved_count = 0
    try:
        for entry in entries:
            guid = str(entry.get("id") or entry.get("link", ""))
            title = str(entry.get("title", ""))
            link = str(entry.get("link", ""))
            summary = str(entry.get("summary", ""))
            author = entry.get("author")
            author_str = str(author) if author is not None else None

            # Extract content from entry
            content_list = entry.get("content") or []
            if content_list:
                content = str(content_list[0].get("value", ""))
            else:
                content = summary

            # Parse published datetime
            pub_dt: datetime | None = None
            published_parsed = entry.get("published_parsed")
            updated_parsed = entry.get("updated_parsed")
            if published_parsed:
                t = tuple(int(x) for x in published_parsed[:6])  # type: ignore[union-attr]
                pub_dt = datetime(*t, tzinfo=UTC)
            elif updated_parsed:
                t = tuple(int(x) for x in updated_parsed[:6])  # type: ignore[union-attr]
                pub_dt = datetime(*t, tzinfo=UTC)

            # Check if article already exists
            existing = await RssArticle.find_one(
                RssArticle.feed_url == feed_url,
                RssArticle.guid == guid,
            )
            if not existing:
                new_article = RssArticle(
                    guid=guid,
                    feed_url=feed_url,
                    title=title,
                    link=link,
                    summary=summary,
                    content=content,
                    author=author_str,
                    published=pub_dt,
                    fetched_at=datetime.now(UTC),
                    read_by=[],
                )
                await new_article.insert()
                saved_count += 1

        logger.info(
            f"Background task: RSS {feed_url} saved {saved_count} new articles for user {user_id}"
        )
    except Exception as e:
        logger.error(
            f"Background task failed: Error saving RSS {feed_url} for user {user_id}: {e!r}"
        )


class RssRequest(BaseModel):
    rss_url: str
    save_to_db: bool = False


@router.get("/image-proxy")
async def proxy_rss_image(
    url: str = Query(..., min_length=8, max_length=2048),
    current_user: User = Depends(manager),
):
    """代理 RSS 图片, 避免浏览器直接跨域加载失败。"""
    _: int = current_user.id
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return APIResponse.error(
            message="仅支持 http/https 图片地址", code=400
        )
    if not parsed.hostname or _is_forbidden_target(parsed.hostname):
        return APIResponse.error(message="不允许访问该图片地址", code=400)

    try:
        async with httpx.AsyncClient(
            timeout=_IMAGE_PROXY_TIMEOUT,
            follow_redirects=True,
        ) as client:
            upstream = await client.get(url)
    except httpx.HTTPError:
        return APIResponse.error(message="拉取图片失败", code=502)

    if upstream.status_code >= 400:
        return APIResponse.error(message="拉取图片失败", code=502)

    content_type = upstream.headers.get("content-type", "")
    if not content_type.lower().startswith("image/"):
        return APIResponse.error(message="目标资源不是图片", code=400)

    content = upstream.content
    if len(content) > _IMAGE_PROXY_MAX_BYTES:
        return APIResponse.error(message="图片过大，超过 10MB", code=413)

    headers = {
        "Cache-Control": "public, max-age=3600",
    }
    if upstream.headers.get("etag"):
        headers["ETag"] = upstream.headers["etag"]
    if upstream.headers.get("last-modified"):
        headers["Last-Modified"] = upstream.headers["last-modified"]

    return Response(
        content=content,
        media_type=content_type.split(";")[0].strip(),
        headers=headers,
    )


# 解析RSS链接
@router.post("/parse-rss")
async def parse_rss(
    rss_request: RssRequest,
    tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """解析RSS链接返回RSS内容"""

    rss_url = rss_request.rss_url
    save_to_db = rss_request.save_to_db
    rss_info: RssInfo | None = None

    if save_to_db:
        # 检查用户是否已经保存了相同的RSS链接,避免重复保存
        result = await session.execute(
            select(RssInfo).where(
                (RssInfo.user_id == current_user.id)
                & (RssInfo.rss_url == rss_url)
            )
        )
        rss_info = result.scalar_one_or_none()
        if not rss_info:
            # 先写入基础记录，后续在解析成功后更新meta
            rss_info = RssInfo(user_id=current_user.id, rss_url=rss_url)
            session.add(rss_info)
            await session.flush()
            logger.info(
                f"用户 {current_user.username} 保存了RSS链接: {rss_url}"
            )

    # 先检查Redis缓存中是否有解析结果
    # 注意：当 save_to_db=True 时需要强制拉取最新内容，避免缓存导致新文章未入库
    redis_key = f"rss_cache:{rss_url}"
    cached_data = await redis.get(redis_key)

    if cached_data and not save_to_db:
        logger.info(f"Redis缓存命中: {rss_url}")
        return APIResponse.ok(data=json.loads(cached_data))
    try:
        feed: feedparser.FeedParserDict = feedparser.parse(rss_url)
        if feed.bozo != 0:
            return APIResponse.error(message="无法解析RSS链接", code=400)
        feed_meta = _build_feed_meta(feed)
        feed_published_at = _parse_feed_published_datetime(feed)

        # 解析RSS条目
        entries = []
        for entry in feed.entries:
            entries.append(
                {
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published")
                    or entry.get("updated"),
                    "summary": entry.get("summary", ""),
                    "content": entry.get("content") or None,
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
            await session.commit()

        if save_to_db:
            tasks.add_task(
                save_to_mongo,
                feed_url=rss_url,
                entries=feed.entries,
                user_id=current_user.id,
            )

        # 将解析结果缓存到Redis,设置过期时间为1小时
        await redis.set(
            redis_key,
            json.dumps({"meta": feed_meta, "entries": entries}),
            ex=3600,
        )  # 缓存1小时

        return APIResponse.ok(data={"meta": feed_meta, "entries": entries})
    except Exception as e:
        if save_to_db:
            await session.rollback()
        logger.error(f"解析RSS链接失败: {e!r}")
        return APIResponse.error(message=f"解析RSS链接失败: {e!r}", code=500)


@router.get("/articles")
async def get_articles(
    page: int = 1,
    limit: int = 20,
    feed_url: str | None = None,
    search: str | None = Query(None, min_length=1),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
):
    result = await session.execute(
        select(RssInfo).where(RssInfo.user_id == current_user.id)
    )
    subscriptions = result.scalars().all()
    user_feed_urls = [sub.rss_url for sub in subscriptions]

    if not user_feed_urls:
        return APIResponse.ok(
            data=RssArticleListResponse(
                items=[], total=0, page=page, limit=limit
            ).model_dump()
        )

    if feed_url is not None:
        if feed_url not in user_feed_urls:
            return APIResponse.ok(
                data=RssArticleListResponse(
                    items=[], total=0, page=page, limit=limit
                ).model_dump()
            )
        query = RssArticle.find(RssArticle.feed_url == feed_url)
    else:
        query = RssArticle.find(In(RssArticle.feed_url, user_feed_urls))

    if search is not None:
        query = query.find({"$text": {"$search": search}})  # type: ignore
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
            is_read=current_user.id in article.read_by,
        )
        for article in articles
    ]

    return APIResponse.ok(
        data=RssArticleListResponse(
            items=items, total=total, page=page, limit=limit
        ).model_dump()
    )


@router.get("/articles/{article_id}")
async def get_article(
    article_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
):
    try:
        oid = ObjectId(article_id)
    except Exception:
        return APIResponse.error(message="文章不存在 文章ID错误", code=404)

    article = await RssArticle.find_one(RssArticle.id == oid)

    if article is None:
        logger.warning(f"文章ID {article_id} 不存在")
        return APIResponse.error(message="文章不存在", code=404)

    # 检查用户是否订阅了该 Feed URL（获取权限）
    result = await session.execute(
        select(RssInfo).where(
            RssInfo.user_id == current_user.id,
            RssInfo.rss_url == article.feed_url,
        )
    )
    subscription = result.scalar_one_or_none()

    # 如果用户没有订阅该源，返回无权限
    if subscription is None:
        logger.warning(
            f"用户 {current_user.username} 无权限访问文章 {article_id}"
        )
        return APIResponse.error(message="文章不存在", code=404)

    response = RssArticleResponse(
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
        is_read=current_user.id in article.read_by,
    )

    return APIResponse.ok(data=response.model_dump())


# 获取当前用户的RSS订阅列表
@router.get("/subscriptions")
async def get_subscriptions(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
):
    """获取当前用户的RSS订阅列表"""
    result = await session.execute(
        select(RssInfo).where(RssInfo.user_id == current_user.id)
    )
    subscriptions = result.scalars().all()
    data = [
        RssSubscriptionResponse(
            id=sub.id,
            rss_url=sub.rss_url,
            feed_title=sub.feed_title,
            feed_link=sub.feed_link,
            feed_description=sub.feed_description,
            feed_published_at=sub.feed_published_at,
            entry_count=sub.entry_count,
            last_fetched_at=sub.last_fetched_at,
            created_at=sub.created_at,
        )
        for sub in subscriptions
    ]
    return APIResponse.ok(data=[item.model_dump() for item in data])


# 手动刷新某个RSS订阅，拉取并保存最新文章
@router.post("/subscriptions/{subscription_id}/refresh")
async def refresh_subscription(
    subscription_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """手动刷新指定订阅并保存新文章"""
    result = await session.execute(
        select(RssInfo).where(RssInfo.id == subscription_id)
    )
    rss_info = result.scalar_one_or_none()

    if rss_info is None:
        return APIResponse.error(message="订阅不存在", code=404)

    if rss_info.user_id != current_user.id:
        return APIResponse.error(message="无权限刷新此订阅", code=403)

    rss_url = rss_info.rss_url

    # 手动刷新时清理缓存，确保强制拉取最新内容
    redis_key = f"rss_cache:{rss_url}"
    await redis.delete(redis_key)

    try:
        feed: feedparser.FeedParserDict = feedparser.parse(rss_url)
        if feed.bozo != 0:
            return APIResponse.error(message="无法解析RSS链接", code=400)
        feed_meta = _build_feed_meta(feed)
        feed_published_at = _parse_feed_published_datetime(feed)
        fetched_at = datetime.now(UTC)

        saved_count = 0
        for entry in feed.entries:
            guid = str(entry.get("id") or entry.get("link", ""))
            title = str(entry.get("title", ""))
            link = str(entry.get("link", ""))
            summary = str(entry.get("summary", ""))
            raw_author = entry.get("author")
            author = str(raw_author) if raw_author is not None else None
            content_list = entry.get("content") or []
            if content_list:
                content = str(content_list[0].get("value", ""))
            else:
                content = summary

            pub_dt: datetime | None = None
            published_parsed = entry.get("published_parsed")
            updated_parsed = entry.get("updated_parsed")
            if published_parsed:
                t = tuple(int(x) for x in published_parsed[:6])  # type: ignore[union-attr]
                pub_dt = datetime(*t, tzinfo=UTC)
            elif updated_parsed:
                t = tuple(int(x) for x in updated_parsed[:6])  # type: ignore[union-attr]
                pub_dt = datetime(*t, tzinfo=UTC)

            existing = await RssArticle.find_one(
                RssArticle.feed_url == rss_url,
                RssArticle.guid == guid,
            )
            if existing:
                continue

            new_article = RssArticle(
                guid=guid,
                feed_url=rss_url,
                title=title,
                link=link,
                summary=summary,
                content=content,
                author=author,
                published=pub_dt,
                fetched_at=fetched_at,
                read_by=[],
            )
            await new_article.insert()
            saved_count += 1

        rss_info.feed_title = feed_meta.get("title") or None
        rss_info.feed_link = feed_meta.get("link") or None
        rss_info.feed_description = feed_meta.get("description") or None
        rss_info.feed_published_at = feed_published_at
        rss_info.entry_count = len(feed.entries)
        rss_info.last_fetched_at = fetched_at
        await session.commit()

        logger.info(
            f"用户 {current_user.username} 手动刷新RSS: {rss_url}, 新增 {saved_count} 篇文章"
        )
        return APIResponse.ok(
            data={
                "subscription_id": subscription_id,
                "rss_url": rss_url,
                "saved_count": saved_count,
            }
        )
    except Exception as e:
        await session.rollback()
        logger.error(f"手动刷新RSS失败: {e!r}")
        return APIResponse.error(message=f"手动刷新RSS失败: {e!r}", code=500)


# 删除RSS订阅及其所有文章
@router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(
    subscription_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
):
    """删除RSS订阅及其关联的所有文章"""
    result = await session.execute(
        select(RssInfo).where(RssInfo.id == subscription_id)
    )
    rss_info = result.scalar_one_or_none()

    if rss_info is None:
        return APIResponse.error(message="订阅不存在", code=404)

    if rss_info.user_id != current_user.id:
        return APIResponse.error(message="无权限删除此订阅", code=403)

    # 删除 MongoDB 中的所有相关文章
    await RssArticle.find(RssArticle.feed_url == rss_info.rss_url).delete()

    # 删除 SQL 中的订阅记录
    await session.delete(rss_info)
    await session.commit()

    logger.info(
        f"用户 {current_user.username} 删除了RSS订阅: {rss_info.rss_url}"
    )
    return APIResponse.ok(data={"message": "订阅已删除"})


# 标记文章为已读
@router.post("/articles/{article_id}/read")
async def mark_article_read(
    article_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
):
    """标记文章为已读(将用户ID添加到read_by列表,使用$addToSet实现幂等性)"""
    # 获取用户订阅的所有 feed_url
    result = await session.execute(
        select(RssInfo).where(RssInfo.user_id == current_user.id)
    )
    subscriptions = result.scalars().all()
    user_feed_urls = [sub.rss_url for sub in subscriptions]

    # 解析 ObjectId
    try:
        oid = ObjectId(article_id)
    except InvalidId, ValueError:
        return APIResponse.error(message="文章不存在", code=404)

    article = await RssArticle.find_one(RssArticle.id == oid)

    if article is None or article.feed_url not in user_feed_urls:
        return APIResponse.error(message="文章不存在", code=404)

    # 使用查询更新以避免 merge_models 中 result 为 None 的问题
    await RssArticle.find_one(RssArticle.id == oid).update(
        {"$addToSet": {"read_by": current_user.id}}
    )  # type: ignore

    logger.info(f"用户 {current_user.id} 标记文章 {article_id} 为已读")
    return APIResponse.ok(data={"message": "文章已标记为已读"})


# 标记文章为未读
@router.delete("/articles/{article_id}/read")
async def mark_article_unread(
    article_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
):
    """标记文章为未读(从read_by列表中移除用户ID)"""
    # 获取用户订阅的所有 feed_url
    result = await session.execute(
        select(RssInfo).where(RssInfo.user_id == current_user.id)
    )
    subscriptions = result.scalars().all()
    user_feed_urls = [sub.rss_url for sub in subscriptions]

    # 解析 ObjectId
    try:
        oid = ObjectId(article_id)
    except InvalidId, ValueError:
        return APIResponse.error(message="文章不存在", code=404)

    article = await RssArticle.find_one(RssArticle.id == oid)

    if article is None or article.feed_url not in user_feed_urls:
        return APIResponse.error(message="文章不存在", code=404)

    # 使用查询更新以避免 merge_models 中 result 为 None 的问题
    await RssArticle.find_one(RssArticle.id == oid).update(
        {"$pull": {"read_by": current_user.id}}
    )  # type: ignore

    logger.info(f"用户 {current_user.id} 标记文章 {article_id} 为未读")
    return APIResponse.ok(data={"message": "文章已标记为未读"})
