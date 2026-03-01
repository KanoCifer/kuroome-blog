"""使用 SQLAlchemy 2.0 异步模式进行数据库依赖注入。

本模块为数据库会话提供 FastAPI 依赖注入,并确保
使用 SQLAlchemy 2.0 的异步会话模式并进行适当的清理。
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.ext.asyncio.engine import AsyncEngine

# 加载环境变量
dotenv_path: Path = Path(__file__).resolve().parent.parent.parent / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)


def print_path_info():
    print(f"Current file path: {Path(__file__).resolve()}")
    print(f"Parent directory: {Path(__file__).resolve().parent}")
    print(f"Grandparent directory: {Path(__file__).resolve().parent.parent}")
    print(f".env file path: {dotenv_path}")


database_url: str | None = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

async_engine: AsyncEngine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    # 连接池配置
    pool_pre_ping=True,
    pool_recycle=3600,
)

# 使用 async_sessionmaker 创建异步会话工厂
AsyncSessionFactory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=True,
)


@asynccontextmanager
async def get_async_session():
    """数据库会话的上下文管理器。

    用法:
        async with get_async_session() as session:
            result = await session.execute(...)
    """
    session = AsyncSessionFactory(bind=async_engine)
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def get_session() -> AsyncGenerator[AsyncSession]:
    """FastAPI dependency for database sessions.
    依赖注入函数提供数据库会话给 FastAPI 路由。

    Usage:
        @app.get("/items")
        async def read_items(session: AsyncSession = Depends(get_session)):
            ...
    """
    session = AsyncSessionFactory(bind=async_engine)
    try:
        yield session

    finally:
        await session.close()


async def close_db_connections() -> None:
    """Close all database connections.

    Call this during application shutdown.
    """
    await async_engine.dispose()


if __name__ == "__main__":
    print_path_info()
