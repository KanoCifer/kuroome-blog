from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event


class EventRepo:
    """事件数据访问层 —— 只负责 Event 表的查询与计数。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

    async def get_events(
        self,
        *,
        type: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        offset: int = 0,
        limit: int = 10,
    ) -> list[Event]:
        """分页查询事件，按时间倒序。所有过滤条件均可选。"""
        stmt = select(Event).order_by(Event.timestamp.desc())
        if type is not None:
            stmt = stmt.where(Event.type == type)
        if start is not None:
            stmt = stmt.where(Event.timestamp >= start)
        if end is not None:
            stmt = stmt.where(Event.timestamp <= end)
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_events(
        self,
        *,
        type: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> int:
        """统计满足过滤条件的事件总数，供分页元数据使用。"""
        stmt = select(func.count(Event.id))
        if type is not None:
            stmt = stmt.where(Event.type == type)
        if start is not None:
            stmt = stmt.where(Event.timestamp >= start)
        if end is not None:
            stmt = stmt.where(Event.timestamp <= end)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())
