from __future__ import annotations

from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from beanie import init_beanie
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.configs.config import settings
from app.configs.logger import logger
from app.dependencies.aps import run_migration_job
from app.dependencies.database import close_db_connections
from app.dependencies.mongo import closeclient, init_mongo
from app.exceptions import register_exception_handlers
from app.models.mgmodel import MessageBoard, Post
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


# 生命周期，初始化和清理资源
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_mongo(app)
    await init_beanie(
        database=app.state.mongo,
        document_models=[MessageBoard, Post],
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
# 配置允许的源（例如你的前端地址）
origins = [
    "http://localhost",
    "http://localhost:5173",  # 假设你的 Vue/React 跑在 3000 端口
    "https://kanocifer.chat",  # 生产环境的前端地址
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 允许这些源跨域
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法 (GET, POST, etc.)
    allow_headers=["*"],  # 允许所有头部
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
