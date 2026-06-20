from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime

from beanie import init_beanie
from fastapi import FastAPI

from app.api.des import (
    close_db_connections,
    close_mongo_client,
    close_redis,
    init_mongo,
    init_redis,
    limiter,
)
from app.core import get_settings, register_exception_handlers
from app.core import logger as app_logger
from app.middleware import register_middleware
from app.models.blog import Post
from app.models.changelog import Changelog
from app.models.devtask import DevTask
from app.models.fishing import FishingModelMeta, FishingRecord
from app.models.friendlink import FriendLinks
from app.models.moment import Moment
from app.models.rss import RssArticle
from app.models.subscription import SubscriptionLog
from app.models.weread import Archive, User, UserBook, WereadBook
from app.plugins.cache import close_cache_redis
from app.plugins.notification import Message, NotificationContext, notify
from app.plugins.task import TaskPlugin
from app.router import register_router, setup_media


async def initialize_resources(app: FastAPI):
    """初始化所有资源连接：MongoDB、Beanie、Redis、Taskiq"""
    await init_mongo(app)
    await init_beanie(
        database=app.state.mongo,
        document_models=[
            Moment,
            Post,
            RssArticle,
            SubscriptionLog,
            FishingRecord,
            FishingModelMeta,
            FriendLinks,
            DevTask,
            User,
            WereadBook,
            UserBook,
            Archive,
            Changelog,
        ],
    )
    app.state.redis = await init_redis()

    app.state.task_plugin = TaskPlugin()
    try:
        await app.state.task_plugin.startup()
        app_logger.info("Taskiq broker started successfully")
    except Exception as e:
        app_logger.warning(f"Taskiq broker failed to start: {e!s}")

    app_logger.debug(f"Settings:{get_settings().model_dump()}")
    app_logger.info("FastAPI started successfully.")

    if app.state.redis is not None and get_settings().SEND_BOOT_EMAIL:
        try:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            app_logger.bind(persist=True).info(f"API服务启动｜时间：{now}")

            # 分布式锁：多 worker 并发启动时，只有第一个抢到锁的进程发送启动通知，
            # 其余进程跳过，避免重复发送。锁带 TTL 兜底异常退出未释放的情况。
            acquired = await app.state.redis.set(
                "notify:boot:lock", now, nx=True, ex=60
            )
            if not acquired:
                app_logger.info("启动通知已由其它 worker 发送，跳过")
            else:
                await notify(
                    channels=["feishu"],
                    message=Message(
                        title="💻Kuroome Blog API 启动通知",
                        body=f"✅Kuroome Blog API 已成功启动！当前时间：{now}",
                    ),
                    ctx=NotificationContext(
                        feishu_webhook_url=get_settings().FEISHU_WEBHOOK_URL
                    ),
                )
        except Exception:
            app_logger.bind(persist=True).warning("❌发送启动通知失败")


async def cleanup_resources(app: FastAPI):
    """关闭所有资源连接：Redis、MongoDB、PostgreSQL、Taskiq"""
    await close_redis(app)
    await close_cache_redis()
    await app.state.client.close()
    await close_mongo_client(app)
    await close_db_connections()

    try:
        await app.state.task_plugin.shutdown()
        app_logger.info("Taskiq broker shutdown successfully")
    except Exception as e:
        app_logger.warning(f"Taskiq broker shutdown failed: {e!s}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await initialize_resources(app)
    yield
    await cleanup_resources(app=app)


# 实例化 FastAPI 应用
app = FastAPI(
    title=get_settings().API_TITLE,
    description=get_settings().API_DESCRIPTION,
    version=get_settings().API_VERSION,
    lifespan=lifespan,
)

# Attach slowapi limiter to app state
app.state.limiter = limiter

register_middleware(app=app)
register_exception_handlers(app=app)
register_router(app=app)
setup_media(app=app)
