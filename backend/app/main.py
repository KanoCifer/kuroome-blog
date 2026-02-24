from __future__ import annotations

from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

import app.models
from app.configs.config import settings
from app.dependencies.database import close_db_connections
from app.dependencies.mongo import closeclient, init_mongo
from app.exceptions import register_exception_handlers
from app.routers import auth, blog, books, messages, public, users, weread


# 缓存配置实例，避免重复创建
@lru_cache
def get_settings():
    return settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_mongo()

    yield

    await closeclient()
    await close_db_connections()


# 实例化 FastAPI 应用
app = FastAPI(
    title=get_settings().API_TITLE,
    description=get_settings().API_DESCRIPTION,
    version=get_settings().API_VERSION,
    lifespan=lifespan,
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(blog.router, prefix="/api/v1")
app.include_router(books.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(public.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(weread.router, prefix="/api/v1")

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
