from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import psutil
from redis.asyncio import Redis as AsyncRedis

from app.models.models import User
from app.repositories.monitor_repo import MonitorRepository


class MonitorDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class MonitorService:
    def __init__(self, repo: MonitorRepository, redis: AsyncRedis) -> None:
        self.repo = repo
        self.redis = redis

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

    @staticmethod
    def _to_sse_event(payload: dict[str, float | int | None]) -> str:
        return f"data: {json.dumps(payload)}\\n\\n"

    async def get_overview(self, days: int) -> dict:
        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(days=days)

        total_visits = await self.repo.count_visits_since(start_time)
        unique_visitors = await self.repo.count_unique_visitors_since(
            start_time
        )
        unique_visitor_ids = await self.repo.count_unique_visitor_ids_since(
            start_time
        )
        top_pages = await self.repo.get_top_pages_since(start_time, limit=10)
        browser_stats = await self.repo.get_browser_stats_since(start_time)
        os_stats = await self.repo.get_os_stats_since(start_time)
        daily_trend = await self.repo.get_daily_trend_since(start_time)

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

    async def get_visitors(self, days: int, page: int, page_size: int) -> dict:
        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(days=days)

        total = await self.repo.count_visits_since(start_time)
        offset = (page - 1) * page_size
        visitors = await self.repo.list_visitors_since(
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
        days: int,
        page: int,
        page_size: int,
    ) -> dict:
        end_time = datetime.now(UTC)
        start_time = end_time - timedelta(days=days)

        users = await self.repo.list_users_with_login_records()

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

    async def get_online_users(self, include_user_details: bool) -> dict:
        online_count_raw = await self.redis.get("stats:online_count")
        online_count = int(online_count_raw) if online_count_raw else 0

        online_user_ids_raw = await self.redis.zrange("online_users_z", 0, -1)
        online_user_ids = [
            int(uid.decode() if isinstance(uid, bytes) else str(uid))
            for uid in online_user_ids_raw
        ]

        user_details: list[dict] = []
        if include_user_details and online_user_ids:
            users: list[User] = await self.repo.list_users_by_ids(
                online_user_ids
            )
            user_details = [
                {
                    "id": user.id,
                    "username": user.username,
                    "name": user.name,
                    "email": user.profile.email if user.profile else None,
                    "avatar": user.profile.photo if user.profile else None,
                    "is_admin": user.is_admin,
                    "active": user.active,
                }
                for user in users
            ]

        return {
            "online_count": online_count,
            "online_user_ids": online_user_ids,
            "user_details": user_details,
        }

    async def stream_server_status(self) -> AsyncIterator[str]:
        while True:
            payload = self._get_server_status_payload()
            yield self._to_sse_event(payload)
            await asyncio.sleep(5)
