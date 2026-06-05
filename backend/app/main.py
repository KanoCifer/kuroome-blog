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
from app.models.beanie import (
    DevTask,
    FriendLinks,
    MessageBoard,
    Post,
    RssArticle,
    SubscriptionLog,
)
from app.models.fishing import FishingModelMeta, FishingRecord
from app.models.weread import Archive, User, UserBook, WereadBook
from app.router import register_router, setup_media
from app.tasks import broker, send_feishu_message
from app.utils import close_cache_redis


async def cleanup_resources(app: FastAPI):
    """关闭所有资源连接包括 Redis MongoDB PostgreSQL"""
    await close_redis(app)  # 关闭 Redis 连接池
    await close_cache_redis()  # 关闭缓存 Redis 连接
    await app.state.client.close()  # 关闭 MongoDB 连接
    await close_mongo_client(app)  # 关闭 MongoDB 客户端
    await close_db_connections()  # 关闭数据库连接池

    # 关闭 Taskiq broker
    try:
        await broker.shutdown()
        app_logger.info("Taskiq broker shutdown successfully")
    except Exception as e:
        app_logger.warning(f"Taskiq broker shutdown failed: {e!s}")


# 生命周期，初始化和清理资源
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_mongo(app)
    await init_beanie(
        database=app.state.mongo,
        document_models=[
            MessageBoard,
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
        ],
    )
    app.state.redis = await init_redis()

    # 启动 Taskiq broker
    try:
        await broker.startup()
        app_logger.info("Taskiq broker started successfully")
    except Exception as e:
        app_logger.warning(f"Taskiq broker failed to start: {e!s}")

    app_logger.debug(f"Settings:{get_settings().model_dump()}")
    app_logger.info("FastAPI started successfully.")

    # 发送引导邮件和飞书消息
    if app.state.redis is not None and get_settings().SEND_BOOT_EMAIL:
        try:
            app_logger.info("✅启动通知任务已添加到队列")
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            await send_feishu_message.kiq(
                message=f"✅Kuroome Blog API 已成功启动！当前时间：{now}",
                msg_type="post",
                title="💻Kuroome Blog API 启动通知",
            )
        except Exception as e:
            app_logger.warning(f"❌发送启动通知失败: {e!s}")

    yield

    # 应用关闭时的清理工作
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
