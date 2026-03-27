from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import psutil
from redis.asyncio import Redis as AsyncRedis

from app.models.models import User
from app.repositories.monitor_repo import MonitorRepo


class MonitorDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class MonitorService:
    def __init__(
        self,
        repo: MonitorRepo,
        redis: AsyncRedis,
    ) -> None:
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

        repo = self.repo

        total_visits = await repo.count_visits_since(start_time)
        unique_visitors = await repo.count_unique_visitors_since(start_time)
        unique_visitor_ids = await repo.count_unique_visitor_ids_since(
            start_time
        )
        top_pages = await repo.get_top_pages_since(start_time, limit=10)
        browser_stats = await repo.get_browser_stats_since(start_time)
        os_stats = await repo.get_os_stats_since(start_time)
        daily_trend = await repo.get_daily_trend_since(start_time)

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

        repo = self.repo

        total = await repo.count_visits_since(start_time)
        offset = (page - 1) * page_size
        visitors = await repo.list_visitors_since(
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

        repo = self.repo

        users = await repo.list_users_with_login_records()

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
        redis = self.redis

        online_count_raw = await redis.get("stats:online_count")
        online_count = int(online_count_raw) if online_count_raw else 0

        online_user_ids_raw = await redis.zrange("online_users_z", 0, -1)
        online_user_ids = [
            int(uid.decode() if isinstance(uid, bytes) else str(uid))
            for uid in online_user_ids_raw
        ]

        user_details: list[dict] = []
        if include_user_details and online_user_ids:
            repo = self.repo
            users: list[User] = await repo.list_users_by_ids(online_user_ids)
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

    async def get_daily_summary(self, date: datetime) -> dict:
        """获取指定日期的访问统计摘要。

        Args:
            date: 日期（取其当天 00:00 ~ 次日 00:00）

        Returns:
            包含总访问量、独立访客、热门页面等统计信息的字典
        """
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

        repo = self.repo

        total_visits = await repo.count_visits_between(start, end)
        unique_visitors = await repo.count_unique_visitors_between(start, end)
        unique_ips = await repo.count_unique_ips_between(start, end)
        top_pages = await repo.get_top_pages_between(start, end, limit=5)
        browser_stats = await repo.get_browser_stats_between(start, end)
        os_stats = await repo.get_os_stats_between(start, end)
        device_stats = await repo.get_device_stats_between(start, end)

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

    async def cleanup_stale_heartbeats(
        self, *, cutoff_seconds: int = 600
    ) -> dict:
        """清理过期心跳并同步用户在线状态到数据库。

        Args:
            cutoff_seconds: 超时秒数，默认 600 秒 (10 分钟)

        Returns:
            包含清理统计信息的字典
        """
        from sqlalchemy import update

        from app.api.des.db import AsyncSessionFactory
        from app.models.models import User

        redis = self.redis

        now = int(datetime.now(UTC).timestamp())
        cutoff_time = now - cutoff_seconds

        removed_count = await redis.zremrangebyscore(
            "online_users_z", 0, cutoff_time
        )
        online_count = await redis.zcard("online_users_z")

        await redis.set("stats:online_count", str(online_count), ex=120)

        online_user_ids = await redis.zrange("online_users_z", 0, -1)
        online_user_ids = [
            int(uid.decode() if isinstance(uid, bytes) else str(uid))
            for uid in online_user_ids
        ]

        if online_user_ids:
            async with AsyncSessionFactory() as session:
                await session.execute(
                    update(User)
                    .where(User.id.in_(online_user_ids))
                    .values(active=True)
                    .execution_options(synchronize_session=False)
                )
                await session.execute(
                    update(User)
                    .where(
                        User.id.not_in(online_user_ids),
                        User.active,
                    )
                    .values(active=False)
                    .execution_options(synchronize_session=False)
                )
                await session.commit()

        return {
            "removed_count": removed_count,
            "online_count": online_count,
        }
