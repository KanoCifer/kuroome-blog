from __future__ import annotations

import time
from contextlib import asynccontextmanager
from pathlib import Path

from beanie import init_beanie
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.configs import get_settings, logger
from app.configs.logger import logger as app_logger
from app.dependencies.csrf import setup_csrf
from app.dependencies.database import close_db_connections
from app.dependencies.limiter import limiter
from app.dependencies.mongo import close_mongo_client, init_mongo
from app.dependencies.redis import (
    close_redis,
    init_redis,
)
from app.exceptions import register_exception_handlers
from app.models.mgmodel import MessageBoard, Post, RssArticle
from app.routers import (
    admin,
    aiagent,
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
from app.tasks import send_bootstrap_emails
from app.utils.cache import close_cache_redis


async def cleanup_resources(app: FastAPI):
    """关闭所有资源连接包括 Redis MongoDB PostgreSQL"""
    await close_redis(app)  # 关闭 Redis 连接池
    await close_cache_redis()  # 关闭缓存 Redis 连接
    await app.state.client.close()  # 关闭 MongoDB 连接
    await close_mongo_client(app)  # 关闭 MongoDB 客户端
    await close_db_connections()  # 关闭数据库连接池


# 生命周期，初始化和清理资源
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_mongo(app)
    await init_beanie(
        database=app.state.mongo,
        document_models=[MessageBoard, Post, RssArticle],
    )
    app.state.redis, app.state.redis2 = await init_redis()

    logger.debug(f"Settings:{get_settings().model_dump()}")
    logger.info("FastAPI started successfully.")

    # 发送引导邮件
    admin_email: str = get_settings().ADMIN_EMAIL
    bootstrap_key: str = f"bootstrap_email_sent:{admin_email}"
    if app.state.redis is not None and get_settings().SEND_BOOT_EMAIL:
        lock_acquired = await app.state.redis.set(
            name=bootstrap_key, value="1", ex=600, nx=True
        )
        if lock_acquired:
            await send_bootstrap_emails.kiq(admin_email=admin_email)
            app_logger.info(f"引导邮件任务已添加到队列: {admin_email}")
        else:
            app_logger.info(f"引导邮件已在24小时内发送过，跳过: {admin_email}")

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
app.include_router(admin.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(blog.router, prefix="/api/v1")
app.include_router(books.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(public.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(weread.router, prefix="/api/v1")
app.include_router(rss.router, prefix="/api/v1")
app.include_router(monitor.router, prefix="/api/v1")
app.include_router(aiagent.router, prefix="/api/v1")

register_exception_handlers(app)

app.add_middleware(
    middleware_class=SessionMiddleware,
    secret_key=get_settings().SECRET_KEY,
)

setup_csrf(app)
# 配置允许的源（例如你的前端地址）
origins: list[str] = [
    "http://localhost",
    "http://localhost:5173",
    "https://kanocifer.chat",
]

app.add_middleware(
    CORSMiddleware,
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
    response.headers["X-Process-Time"] = f"{process_time}s"
    return response


# 挂载 media 文件夹为静态文件目录（使用相对于本文件的绝对路径，确保指向 app/media）
# 访问路径：http://localhost:5555/api/v1/media/文件名
media_dir = Path(__file__).resolve().parent / "media"
app.mount(
    "/api/v1/media/",
    StaticFiles(directory=str(media_dir), check_dir=True),
    name="media",
)

app.add_exception_handler(
    exc_class_or_status_code=RateLimitExceeded,
    handler=_rate_limit_exceeded_handler,  # type: ignore
)  # type: ignore
