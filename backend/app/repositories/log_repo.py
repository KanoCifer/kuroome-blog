from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.log import Log


class LogRepo:
    """日志数据访问层 —— 只负责 Log 表的查询与计数。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get_logs(
        self,
        *,
        level: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        offset: int = 0,
        limit: int = 10,
    ) -> list[Log]:
        """分页查询日志，按时间倒序。所有过滤条件均可选。"""
        stmt = select(Log).order_by(Log.timestamp.desc())
        if level is not None:
            stmt = stmt.where(Log.level == level)
        if start is not None:
            stmt = stmt.where(Log.timestamp >= start)
        if end is not None:
            stmt = stmt.where(Log.timestamp <= end)
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_logs(
        self,
        *,
        level: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> int:
        """统计满足过滤条件的日志总数，供分页元数据使用。"""
        stmt = select(func.count(Log.id))
        if level is not None:
            stmt = stmt.where(Log.level == level)
        if start is not None:
            stmt = stmt.where(Log.timestamp >= start)
        if end is not None:
            stmt = stmt.where(Log.timestamp <= end)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())
