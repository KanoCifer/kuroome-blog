from __future__ import annotations

from datetime import datetime

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import User, VisitorTrack


class MonitorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def count_visits_since(self, start_time: datetime) -> int:
        result = await self.session.execute(
            select(func.count(VisitorTrack.id)).where(
                VisitorTrack.visit_time >= start_time
            )
        )
        return int(result.scalar_one() or 0)

    async def count_unique_visitors_since(self, start_time: datetime) -> int:
        result = await self.session.execute(
            select(func.count(func.distinct(VisitorTrack.ip_address))).where(
                VisitorTrack.visit_time >= start_time
            )
        )
        return int(result.scalar_one() or 0)

    async def count_unique_visitor_ids_since(
        self,
        start_time: datetime,
    ) -> int:
        result = await self.session.execute(
            select(func.count(func.distinct(VisitorTrack.visitor_id))).where(
                VisitorTrack.visit_time >= start_time
            )
        )
        return int(result.scalar_one() or 0)

    async def get_top_pages_since(
        self,
        start_time: datetime,
        *,
        limit: int = 10,
    ) -> list[dict[str, int | str]]:
        result = await self.session.execute(
            select(
                VisitorTrack.page_path,
                func.count(VisitorTrack.id).label("count"),
            )
            .where(VisitorTrack.visit_time >= start_time)
            .group_by(VisitorTrack.page_path)
            .order_by(func.count(VisitorTrack.id).desc())
            .limit(limit)
        )
        return [
            {"page_path": row[0], "count": row[1]} for row in result.fetchall()
        ]

    async def get_browser_stats_since(
        self,
        start_time: datetime,
    ) -> list[dict[str, int | str | None]]:
        count_expr = func.count(VisitorTrack.id).label("count")
        result = await self.session.execute(
            select(
                VisitorTrack.browser_name,
                VisitorTrack.browser_version,
                count_expr,
            )
            .where(VisitorTrack.visit_time >= start_time)
            .group_by(VisitorTrack.browser_name, VisitorTrack.browser_version)
            .order_by(desc("count"))
        )
        return [
            {
                "browser_name": row[0],
                "browser_version": row[1],
                "count": row[2],
            }
            for row in result.fetchall()
        ]

    async def get_os_stats_since(
        self,
        start_time: datetime,
    ) -> list[dict[str, int | str | None]]:
        result = await self.session.execute(
            select(
                VisitorTrack.os_name,
                VisitorTrack.os_version,
                func.count(VisitorTrack.id).label("count"),
            )
            .where(VisitorTrack.visit_time >= start_time)
            .group_by(VisitorTrack.os_name, VisitorTrack.os_version)
            .order_by(func.count(VisitorTrack.id).desc())
        )
        return [
            {
                "os_name": row[0],
                "os_version": row[1],
                "count": row[2],
            }
            for row in result.fetchall()
        ]

    async def get_daily_trend_since(
        self,
        start_time: datetime,
    ) -> list[dict[str, int | str]]:
        result = await self.session.execute(
            select(
                func.date(VisitorTrack.visit_time).label("date"),
                func.count(VisitorTrack.id).label("count"),
            )
            .where(VisitorTrack.visit_time >= start_time)
            .group_by(func.date(VisitorTrack.visit_time))
            .order_by(func.date(VisitorTrack.visit_time).desc())
        )
        return [
            {"date": str(row[0]), "count": row[1]} for row in result.fetchall()
        ]

    async def list_visitors_since(
        self,
        start_time: datetime,
        *,
        offset: int,
        limit: int,
    ) -> list[VisitorTrack]:
        result = await self.session.execute(
            select(VisitorTrack)
            .where(VisitorTrack.visit_time >= start_time)
            .order_by(VisitorTrack.visit_time.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_users_with_login_records(self) -> list[User]:
        result = await self.session.execute(
            select(User).where(User.login_count > 0).order_by(User.id.desc())
        )
        return list(result.scalars().all())

    async def list_users_by_ids(self, user_ids: list[int]) -> list[User]:
        if not user_ids:
            return []

        result = await self.session.execute(
            select(User)
            .where(User.id.in_(user_ids))
            .options(selectinload(User.profile))
        )
        return list(result.scalars().all())

    async def count_visits_between(
        self, start: datetime, end: datetime
    ) -> int:
        result = await self.session.execute(
            select(func.count(VisitorTrack.id)).where(
                VisitorTrack.visit_time >= start,
                VisitorTrack.visit_time < end,
            )
        )
        return int(result.scalar_one() or 0)

    async def count_unique_visitors_between(
        self, start: datetime, end: datetime
    ) -> int:
        result = await self.session.execute(
            select(func.count(func.distinct(VisitorTrack.visitor_id))).where(
                VisitorTrack.visit_time >= start,
                VisitorTrack.visit_time < end,
            )
        )
        return int(result.scalar_one() or 0)

    async def count_unique_ips_between(
        self, start: datetime, end: datetime
    ) -> int:
        result = await self.session.execute(
            select(func.count(func.distinct(VisitorTrack.ip_address))).where(
                VisitorTrack.visit_time >= start,
                VisitorTrack.visit_time < end,
            )
        )
        return int(result.scalar_one() or 0)

    async def get_top_pages_between(
        self, start: datetime, end: datetime, *, limit: int = 5
    ) -> list[dict[str, int | str]]:
        result = await self.session.execute(
            select(
                VisitorTrack.page_path,
                func.count(VisitorTrack.id).label("count"),
            )
            .where(
                VisitorTrack.visit_time >= start,
                VisitorTrack.visit_time < end,
            )
            .group_by(VisitorTrack.page_path)
            .order_by(func.count(VisitorTrack.id).desc())
            .limit(limit)
        )
        return [
            {"page_path": row[0], "count": row[1]} for row in result.fetchall()
        ]

    async def get_browser_stats_between(
        self, start: datetime, end: datetime
    ) -> list[dict[str, int | str | None]]:
        result = await self.session.execute(
            select(
                VisitorTrack.browser_name,
                func.count(func.distinct(VisitorTrack.visitor_id)).label(
                    "count"
                ),
            )
            .where(
                VisitorTrack.visit_time >= start,
                VisitorTrack.visit_time < end,
                VisitorTrack.browser_name.isnot(None),
            )
            .group_by(VisitorTrack.browser_name)
            .order_by(
                func.count(func.distinct(VisitorTrack.visitor_id)).desc()
            )
        )
        return [
            {"browser_name": row[0], "count": row[1]}
            for row in result.fetchall()
        ]

    async def get_os_stats_between(
        self, start: datetime, end: datetime
    ) -> list[dict[str, int | str | None]]:
        result = await self.session.execute(
            select(
                VisitorTrack.os_name,
                func.count(func.distinct(VisitorTrack.visitor_id)).label(
                    "count"
                ),
            )
            .where(
                VisitorTrack.visit_time >= start,
                VisitorTrack.visit_time < end,
                VisitorTrack.os_name.isnot(None),
            )
            .group_by(VisitorTrack.os_name)
            .order_by(
                func.count(func.distinct(VisitorTrack.visitor_id)).desc()
            )
        )
        return [
            {"os_name": row[0], "count": row[1]} for row in result.fetchall()
        ]

    async def get_device_stats_between(
        self, start: datetime, end: datetime
    ) -> list[dict[str, int | str | None]]:
        result = await self.session.execute(
            select(
                VisitorTrack.device_type,
                func.count(func.distinct(VisitorTrack.visitor_id)).label(
                    "count"
                ),
            )
            .where(
                VisitorTrack.visit_time >= start,
                VisitorTrack.visit_time < end,
                VisitorTrack.device_type.isnot(None),
            )
            .group_by(VisitorTrack.device_type)
            .order_by(
                func.count(func.distinct(VisitorTrack.visitor_id)).desc()
            )
        )
        return [
            {"device_type": row[0], "count": row[1]}
            for row in result.fetchall()
        ]
