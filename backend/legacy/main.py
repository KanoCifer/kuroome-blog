from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

import app.models
from app.configs.config import settings
from app.dependencies.database import close_db_connections
from app.dependencies.mongo import closeclient, init_mongo
from app.exceptions import register_exception_handlers
from app.routers import auth, blog, books, messages, public, users, weread


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    print("Starting ReadingList API...")
    await init_mongo()

    yield

    print("Shutting down ReadingList API...")
    await closeclient()
    await close_db_connections()
    # print("All connections closed.")


# 实例化 FastAPI 应用
app = FastAPI(
    title="ReadingList API",
    description="Personal reading tracker API",
    version="1.0.0",
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
    secret_key=settings.secret_key,
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 挂载 media 文件夹为静态文件目录（使用相对于本文件的绝对路径，确保指向 app/media）
# 访问路径：http://localhost:5555/api/media/文件名
media_dir = Path(__file__).resolve().parent / "media"
app.mount("/api/media", StaticFiles(directory=str(media_dir)), name="media")
