import json

import feedparser
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.configs.logger import logger
from app.dependencies.auth import manager
from app.dependencies.database import get_session
from app.dependencies.redis import AsyncRedis, get_async_redis
from app.models.models import RssInfo, User
from app.schemas.response import APIResponse

router = APIRouter(prefix="/rss", tags=["rss"])


class RssRequest(BaseModel):
    rss_url: str
    save_to_db: bool = False


# 解析RSS链接
@router.post("/parse-rss")
async def parse_rss(
    rss_request: RssRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """解析RSS链接返回RSS内容"""

    rss_url = rss_request.rss_url
    save_to_db = rss_request.save_to_db

    if save_to_db:
        # 检查用户是否已经保存了相同的RSS链接，避免重复保存
        result = await session.execute(
            select(RssInfo).where(
                (RssInfo.user_id == current_user.id)
                & (RssInfo.rss_url == rss_url)
            )
        )
        existing_rss = result.scalar_one_or_none()
        if not existing_rss:
            # 将RSS链接保存到数据库
            rss_info = RssInfo(
                user_id=current_user.id,
                rss_url=rss_url,
            )
            session.add(rss_info)
            await session.commit()
            logger.info(
                f"用户 {current_user.username} 保存了RSS链接: {rss_url}"
            )

    # 先检查Redis缓存中是否有解析结果
    redis_key = f"rss_cache:{rss_url}"
    cached_data = await redis.get(redis_key)

    if cached_data:
        logger.info(f"Redis缓存命中: {rss_url}")
        return APIResponse.ok(data=json.loads(cached_data))
    try:
        feed: feedparser.FeedParserDict = feedparser.parse(rss_url)
        if feed.bozo != 0:
            return APIResponse.error(message="无法解析RSS链接", code=400)

            # 安全获取发布时间，兼容不同字段名
        published: str | None = None
        # 优先检查常用的发布时间字段
        if hasattr(feed.feed, "published"):
            published = feed.feed.published  # type: ignore
        elif hasattr(feed.feed, "updated"):  # Atom格式常用
            published = feed.feed.updated  # type: ignore
        elif hasattr(feed.feed, "pubDate"):  # RSS2.0常用
            published = feed.feed.pubDate  # type: ignore

        feed_meta = {
            "title": feed.feed.title,  # type: ignore
            "link": feed.feed.link,  # type: ignore
            "description": feed.feed.description,  # type: ignore
            "published": published,
        }

        # 解析RSS条目

        entries = []
        for entry in feed.entries:
            entries.append(
                {
                    "title": entry.title,
                    "link": entry.link,
                    "published": entry.published,
                    "summary": entry.summary,
                    "content": entry.content
                    if hasattr(entry, "content")
                    else None,
                }
            )

        # 将解析结果缓存到Redis，设置过期时间为1小时
        await redis.set(
            redis_key,
            json.dumps({"meta": feed_meta, "entries": entries}),
            ex=3600,
        )  # 缓存1小时

        return APIResponse.ok(data={"meta": feed_meta, "entries": entries})
    except Exception as e:
        logger.error(f"解析RSS链接失败: {e!r}")
        return APIResponse.error(message=f"解析RSS链接失败: {e!r}", code=500)
