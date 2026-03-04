from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

import feedparser
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import select
from starlette.middleware.sessions import SessionMiddleware

from app.configs.config import settings
from app.configs.logger import logger
from app.dependencies.aps import run_migration_job
from app.dependencies.csrf import setup_csrf
from app.dependencies.database import AsyncSessionFactory, close_db_connections
from app.dependencies.mongo import closeclient, init_mongo
from app.exceptions import register_exception_handlers
from app.models.mgmodel import MessageBoard, Post, RssArticle
from app.models.models import RssInfo
from app.routers import (
    admin,
    auth,
    blog,
    books,
    messages,
    monitor,
    public,
    rss,
    users,
    weread,
)


# 缓存配置实例，避免重复创建
@lru_cache
def get_settings():
    return settings


# RSS 动态刷新任务
async def refresh_rss_feeds():
    """Daily RSS refresh at 8 AM for all users, saves new articles to MongoDB."""
    logger.info("Starting daily RSS feed refresh...")
    try:
        async with AsyncSessionFactory() as session:
            # 查询所有不同的 feed_url
            result = await session.execute(select(RssInfo.rss_url).distinct())
            feed_urls = result.scalars().all()

        if not feed_urls:
            logger.info("No RSS feeds to refresh")
            return

        logger.info(f"Refreshing {len(feed_urls)} RSS feeds...")

        # 使用信号量限制并发数
        semaphore = asyncio.Semaphore(5)

        async def fetch_and_save_feed(feed_url: str):
            async with semaphore:
                try:
                    # 在线程池中运行 feedparser.parse（同步操作）
                    loop = asyncio.get_event_loop()
                    feed = await loop.run_in_executor(
                        None, feedparser.parse, feed_url
                    )

                    if feed.bozo != 0:
                        logger.warning(f"Failed to parse feed: {feed_url}")
                        return 0

                    saved_count = 0
                    for entry in feed.entries:
                        # 提取 guid
                        guid = entry.get("id") or entry.get("link", "")
                        if not guid:
                            continue

                        guid = str(guid)

                        # 检查文章是否已存在
                        existing = await RssArticle.find_one(
                            RssArticle.feed_url == feed_url,
                            RssArticle.guid == guid,
                        )

                        if existing:
                            continue

                        # 提取文章字段
                        title = str(entry.get("title", ""))
                        link = str(entry.get("link", ""))
                        summary = str(entry.get("summary", ""))

                        # 提取 content
                        content_list = entry.get("content")
                        if content_list:
                            content = str(content_list[0].get("value", ""))
                        else:
                            content = summary

                        # 提取 author
                        raw_author = entry.get("author")
                        author = (
                            str(raw_author) if raw_author is not None else None
                        )

                        # 提取发布时间
                        pub_dt: datetime | None = None
                        published_parsed = entry.get("published_parsed")
                        updated_parsed = entry.get("updated_parsed")

                        if published_parsed:
                            t = tuple(int(x) for x in published_parsed[:6])  # type: ignore[union-attr]
                            pub_dt = datetime(*t, tzinfo=UTC)
                        elif updated_parsed:
                            t = tuple(int(x) for x in updated_parsed[:6])  # type: ignore[union-attr]
                            pub_dt = datetime(*t, tzinfo=UTC)

                        # 创建并插入新文章
                        new_article = RssArticle(
                            guid=guid,
                            feed_url=feed_url,
                            title=title,
                            link=link,
                            summary=summary,
                            content=content,
                            author=author,
                            published=pub_dt,
                            fetched_at=datetime.now(UTC),
                            read_by=[],
                        )
                        await new_article.insert()
                        saved_count += 1

                    logger.info(
                        f"RSS feed {feed_url}: saved {saved_count} new articles"
                    )
                    return saved_count

                except Exception as e:
                    logger.error(f"Error refreshing feed {feed_url}: {e!r}")
                    return 0

        # 并发刷新所有 feed
        tasks = [fetch_and_save_feed(url) for url in feed_urls]
        results = await asyncio.gather(*tasks)
        total_saved = sum(results)

        logger.info(
            f"Daily RSS refresh completed. Total new articles: {total_saved}"
        )

    except Exception as e:
        logger.error(f"Error in refresh_rss_feeds: {e!r}")


# 生命周期，初始化和清理资源
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_mongo(app)
    await init_beanie(
        database=app.state.mongo,
        document_models=[MessageBoard, Post, RssArticle],
    )

    # 初始化 APScheduler
    scheduler = AsyncIOScheduler()

    # 配置定时任务
    scheduler.add_job(
        run_migration_job,
        trigger=IntervalTrigger(seconds=600),  # 每 10 分钟执行一次
        id="redis_to_db_migration",
        name="Redis 数据迁移",
        replace_existing=True,
        max_instances=1,  # 关键：防止上一次任务没跑完，下一次又开始了
    )

    scheduler.add_job(
        refresh_rss_feeds,
        trigger=CronTrigger(hour=8),
        id="rss_refresh",
        name="Daily RSS 刷新",
        replace_existing=True,
        max_instances=1,
    )

    scheduler.start()
    # 记录日志，确认 APScheduler 已启动
    logger.info(
        "Application startup complete. APScheduler started with migration job."
    )
    yield

    # 应用关闭时的清理工作
    await app.state.client.close()  # 关闭 MongoDB 连接
    await closeclient(app)
    await close_db_connections()  # 关闭数据库连接池
    scheduler.shutdown()  # 关闭 APScheduler


# 实例化 FastAPI 应用
app = FastAPI(
    title=get_settings().API_TITLE,
    description=get_settings().API_DESCRIPTION,
    version=get_settings().API_VERSION,
    lifespan=lifespan,
)

# Include routers
app.include_router(admin.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(blog.router, prefix="/api/v1")
app.include_router(books.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(public.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(weread.router, prefix="/api/v1")
app.include_router(rss.router, prefix="/api/v1")
app.include_router(monitor.router, prefix="/api/v1")  # 添加监控路由

register_exception_handlers(app)

app.add_middleware(
    SessionMiddleware,
    secret_key=get_settings().SECRET_KEY,
)

setup_csrf(app)
# 配置允许的源（例如你的前端地址）
origins = [
    "http://localhost",
    "http://localhost:5173",  # 假设你的 Vue/React 跑在 3000 端口
    "https://kanocifer.chat",  # 生产环境的前端地址
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)

# 挂载 media 文件夹为静态文件目录（使用相对于本文件的绝对路径，确保指向 app/media）
# 访问路径：http://localhost:5555/api/v1/media/文件名
media_dir = Path(__file__).resolve().parent / "media"
app.mount(
    "/api/v1/media/",
    StaticFiles(directory=str(media_dir), check_dir=True),
    name="media",
)

app.add_exception_handler(
    RateLimitExceeded,
    handler=_rate_limit_exceeded_handler,  # type: ignore
)  # type: ignore
