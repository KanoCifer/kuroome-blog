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
from app.dependencies.csrf import setup_csrf
from app.dependencies.database import close_db_connections
from app.dependencies.limiter import limiter
from app.dependencies.mongo import closeclient, init_mongo
from app.exceptions import register_exception_handlers
from app.models.mgmodel import MessageBoard, Post, RssArticle, SiteStats
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
from app.tasks import broker
from app.utils import redis_cache


# 生命周期，初始化和清理资源
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_mongo(app)
    await init_beanie(
        database=app.state.mongo,
        document_models=[MessageBoard, Post, RssArticle, SiteStats],
    )
    await broker.startup()  # 启动 Celery Broker

    logger.info("FastAPI started successfully.")

    yield

    await broker.shutdown()  # 关闭 Celery Broker

    # 应用关闭时的清理工作
    await redis_cache.aclose()  # 关闭 Redis 连接
    await app.state.client.close()  # 关闭 MongoDB 连接
    await closeclient(app)  # 关闭 MongoDB 客户端
    await close_db_connections()  # 关闭数据库连接池


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


# 中间件：记录请求处理时间
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time: float = time.perf_counter()
    response = await call_next(request)
    process_time: float = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
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
