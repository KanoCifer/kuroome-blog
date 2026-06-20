"""系统运维服务 —— 日志查询等管理类业务。

桥接 :class:`LogRepo` 与分页元数据组装，端点层只管入参校验与响应封装。
"""

from __future__ import annotations

from datetime import datetime

from app.repositories.log_repo import LogRepo
from app.schemas.log import LogResponse
from app.schemas.pagination import PaginationSchema


class SystemService:
    """系统服务 —— 持有 :class:`LogRepo`，提供日志分页查询。"""

    def __init__(self, repo: LogRepo) -> None:
        self.repo: LogRepo = repo

    async def list_logs(
        self,
        *,
        page: int = 1,
        per_page: int = 10,
        level: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> tuple[list[LogResponse], PaginationSchema]:
        """分页查询日志，按时间倒序。

        Returns:
            (日志视图列表, 分页元数据)
        """
        per_page = max(1, min(per_page, 200))
        page = max(1, page)
        offset = (page - 1) * per_page

        total = await self.repo.count_logs(
            level=level, start=start, end=end
        )
        logs = await self.repo.get_logs(
            level=level,
            start=start,
            end=end,
            offset=offset,
            limit=per_page,
        )
        items = [LogResponse.model_validate(log) for log in logs]
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
