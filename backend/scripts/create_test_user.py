"""创建测试用户脚本.

用法:
    uv run python scripts/create_test_user.py
"""

import asyncio
import sys
from pathlib import Path

# 确保能 import app 包
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.models import Base, User


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    # 创建所有表（开发环境可能未走 migration）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        try:
            result = await session.execute(select(User).where(User.username == "test"))
            existing = result.scalar_one_or_none()

            if existing:
                print("用户 'test' 已存在，跳过创建")
                return

            user = User(
                username="test",
                password="test",
                name="Test User",
                active=True,
            )
            session.add(user)
            await session.commit()
            print(f"测试用户创建成功: id={user.id}, username={user.username}")
        except Exception as e:
            await session.rollback()
            print(f"创建失败: {e}")
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
