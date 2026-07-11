from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import psutil
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.monitor_repo import MonitorRepo


class MonitorService:
    def __init__(
        self,
        repo: MonitorRepo,
    ) -> None:
        self.repo = repo

    @staticmethod
    def _get_server_status_payload() -> dict[str, float | int | None]:
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_cores = psutil.cpu_count(logical=True)

        mem = psutil.virtual_memory()
        mem_total = round(mem.total / 1024 / 1024)
        mem_used = round(mem.used / 1024 / 1024)
        mem_usage = round(mem.percent, 2)

        disk = psutil.disk_usage("/")
        disk_total = round(disk.total / 1024 / 1024 / 1024, 2)
        disk_used = round(disk.used / 1024 / 1024 / 1024, 2)
        disk_usage = round(disk.percent, 2)

        return {
            "cpu_percent": cpu_percent,
            "cpu_cores": cpu_cores,
            "mem_total": mem_total,
            "mem_used": mem_used,
            "mem_usage": mem_usage,
            "disk_total": disk_total,
            "disk_used": disk_used,
            "disk_usage": disk_usage,
        }

    async def get_overview(
        self, session: AsyncSession, days: int
    ) -> dict:
        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(days=days)

        repo = self.repo

        total_visits = await repo.count_visits_since(session, start_time)
        unique_visitors = await repo.count_unique_visitors_since(session, start_time)
        unique_visitor_ids = await repo.count_unique_visitor_ids_since(
            session, start_time
        )
        top_pages = await repo.get_top_pages_since(session, start_time, limit=10)
        browser_stats = await repo.get_browser_stats_since(session, start_time)
        os_stats = await repo.get_os_stats_since(session, start_time)
        daily_trend = await repo.get_daily_trend_since(session, start_time)

        return {
            "total_visits": total_visits,
            "unique_visitors": unique_visitors,
            "unique_visitor_ids": unique_visitor_ids,
            "top_pages": top_pages,
            "browser_stats": browser_stats,
            "os_stats": os_stats,
            "daily_trend": daily_trend,
            "period_days": days,
        }

    async def get_visitors(
        self, session: AsyncSession, days: int, page: int, page_size: int
    ) -> dict:
        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(days=days)

        repo = self.repo

        total = await repo.count_visits_since(session, start_time)
        offset = (page - 1) * page_size
        visitors = await repo.list_visitors_since(
            session,
            start_time,
            offset=offset,
            limit=page_size,
        )

        visitor_list = [
            {
                "id": v.id,
                "visitor_id": v.visitor_id,
                "page_url": v.page_url,
                "page_path": v.page_path,
                "referrer": v.referrer,
                "browser": v.browser,
                "screen_resolution": v.screen_resolution,
                "language": v.language,
                "ip_address": v.ip_address,
                "visit_time": v.visit_time.isoformat()
                if v.visit_time
                else None,
            }
            for v in visitors
        ]

        return {
            "list": visitor_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    async def get_user_logins(
        self,
        session: AsyncSession,
        days: int,
        page: int,
        page_size: int,
    ) -> dict:
        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(days=days)

        repo = self.repo

        users = await repo.list_users_with_login_records(session)

        login_logs = []
        for user in users:
            has_recent_login = False
            if user.current_login_at and user.current_login_at >= start_time:
                has_recent_login = True
            if user.last_login_at and user.last_login_at >= start_time:
                has_recent_login = True

            if has_recent_login:
                login_logs.append(
                    {
                        "user_id": user.id,
                        "username": user.username,
                        "name": user.name,
                        "login_count": user.login_count,
                        "last_login_at": (
                            user.last_login_at.isoformat()
                            if user.last_login_at
                            else None
                        ),
                        "current_login_at": (
                            user.current_login_at.isoformat()
                            if user.current_login_at
                            else None
                        ),
                        "last_login_ip": user.last_login_ip,
                        "current_login_ip": user.current_login_ip,
                        "active": user.active,
                    }
                )

        total = len(login_logs)
        offset = (page - 1) * page_size
        paginated_logs = login_logs[offset : offset + page_size]

        return {
            "list": paginated_logs,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    async def get_server_status(self) -> dict[str, float | int | None]:
        return self._get_server_status_payload()

    async def stream_server_status(
        self,
    ) -> AsyncIterator[dict[str, float | int | None]]:
        while True:
            yield self._get_server_status_payload()
            await asyncio.sleep(5)

    async def get_daily_summary(
        self, session: AsyncSession, date: datetime
    ) -> dict:
        """获取指定日期的访问统计摘要。

        Args:
            date: 日期（取其当天 00:00 ~ 次日 00:00）

        Returns:
            包含总访问量、独立访客、热门页面等统计信息的字典
        """
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

        repo = self.repo

        total_visits = await repo.count_visits_between(session, start, end)
        unique_visitors = await repo.count_unique_visitors_between(session, start, end)
        unique_ips = await repo.count_unique_ips_between(session, start, end)
        top_pages = await repo.get_top_pages_between(session, start, end, limit=5)
        browser_stats = await repo.get_browser_stats_between(session, start, end)
        os_stats = await repo.get_os_stats_between(session, start, end)
        device_stats = await repo.get_device_stats_between(session, start, end)

        return {
            "date": start.strftime("%Y-%m-%d"),
            "total_visits": total_visits,
            "unique_visitors": unique_visitors,
            "unique_ips": unique_ips,
            "top_pages": top_pages,
            "browser_stats": browser_stats,
            "os_stats": os_stats,
            "device_stats": device_stats,
        }
