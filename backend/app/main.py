from __future__ import annotations

import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from beanie import init_beanie
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.api.des import (
    close_db_connections,
    close_mongo_client,
    close_redis,
    init_mongo,
    init_redis,
    limiter,
    setup_csrf,
)
from app.api.v1 import (
    admin,
    ai,
    auth,
    blog,
    messages,
    monitor,
    public,
    publish,
    rss,
)
from app.api.v2 import (
    device,
    fishing,
    friendlinks,
    subscriptions,
    weather,
)
from app.api.v2 import (
    devtasks as devtasks_v2,
)
from app.api.v2 import public as public_v2
from app.api.v2 import (
    weread as weread_v2,
)
from app.core import get_settings, register_exception_handlers
from app.core import logger as app_logger
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

# Include routers
# v1 版本API
app.include_router(router=admin.router, prefix="/api/v1")
app.include_router(router=auth.router, prefix="/api/v1")
app.include_router(router=blog.router, prefix="/api/v1")
app.include_router(router=messages.router, prefix="/api/v1")
app.include_router(router=public.router, prefix="/api/v1")
app.include_router(router=rss.router, prefix="/api/v1")
app.include_router(router=monitor.router, prefix="/api/v1")
app.include_router(router=ai.router, prefix="/api/v1")
app.include_router(router=publish.router, prefix="/api/v1")

# v2 版本API
app.include_router(router=subscriptions.router, prefix="/api/v2")
app.include_router(router=device.router, prefix="/api/v2")
app.include_router(router=fishing.router, prefix="/api/v2")
app.include_router(router=weather.router, prefix="/api/v2")
app.include_router(router=public_v2.router, prefix="/api/v2")
app.include_router(router=friendlinks.router, prefix="/api/v2")
app.include_router(router=devtasks_v2.router, prefix="/api/v2")
app.include_router(router=weread_v2.router, prefix="/api/v2")


# 统一注册全局异常处理器
register_exception_handlers(app=app)

app.add_middleware(
    middleware_class=SessionMiddleware,
    secret_key=get_settings().SECRET_KEY,
)

setup_csrf(app=app)
# 配置允许的源（例如你的前端地址）
origins: list[str] = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://kanocifer.chat",
    "https://m.kanocifer.chat",
    "https://api.kanocifer.chat",
]

# 配置 CORS 中间件，允许前端访问 API，并暴露 Set-Cookie 头以支持跨域认证
app.add_middleware(
    middleware_class=CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)


# 中间件：记录请求处理时间
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time: float = time.perf_counter()
    response = await call_next(request)
    process_time: float = round(time.perf_counter() - start_time, 6)

    # 记录长时间异常请求
    if process_time > 1.0:  # 1秒以上的请求视为慢请求
        app_logger.warning(
            f"Request to {request.url.path} took {process_time}s and returned status code {response.status_code}"
        )
    response.headers["X-Process-Time"] = f"{process_time}s"
    return response


# 挂载 media 文件夹为静态文件目录（使用相对于本文件的绝对路径，确保指向 /media）
media_dir: Path = Path(__file__).resolve().parent.parent / "media"
app.mount(
    path="/api/v1/media/",
    app=StaticFiles(directory=str(media_dir), check_dir=True),
    name="media",
)

# 注册慢速API的速率限制异常处理器
app.add_exception_handler(
    exc_class_or_status_code=RateLimitExceeded,
    handler=_rate_limit_exceeded_handler,  # type: ignore
)  # type: ignore
