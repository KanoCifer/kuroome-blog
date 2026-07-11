"""系统运维服务 —— 事件查询等管理类业务。

桥接 :class:`EventRepo` 与分页元数据组装，端点层只管入参校验与响应封装。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.event_repo import EventRepo
from app.schemas.event import EventResponse
from app.schemas.pagination import PaginationSchema


class SystemService:
    """系统服务 —— 持有 :class:`EventRepo`，提供事件分页查询。"""

    def __init__(self, repo: EventRepo) -> None:
        self.repo: EventRepo = repo

    async def list_events(
        self,
        session: AsyncSession,
        *,
        page: int = 1,
        per_page: int = 10,
        type: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> tuple[list[EventResponse], PaginationSchema]:
        """分页查询事件，按时间倒序。

        Returns:
            (事件视图列表, 分页元数据)
        """
        per_page = max(1, min(per_page, 200))
        page = max(1, page)
        offset = (page - 1) * per_page

        total = await self.repo.count_events(
            session, type=type, start=start, end=end
        )
        events = await self.repo.get_events(
            session,
            type=type,
            start=start,
            end=end,
            offset=offset,
            limit=per_page,
        )
        items = [EventResponse.model_validate(event) for event in events]
        pages = (total + per_page - 1) // per_page if total else 0
        pagination = PaginationSchema(
            page=page,
            per_page=per_page,
            total=total,
            pages=pages,
            has_prev=page > 1,
            has_next=page < pages,
            prev_num=page - 1 if page > 1 else None,
            next_num=page + 1 if page < pages else None,
        )
        return items, pagination
