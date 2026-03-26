from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime, timedelta

import psutil
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.des.auth import get_admin_user
from app.api.des.db import get_session
from app.api.des.redis import AsyncRedis, get_async_redis
from app.models.models import User, VisitorTrack
from app.schemas.response import APIResponse

router = APIRouter(prefix="/status", tags=["monitor-status"])

DEFAULT_DAYS = 7
MAX_DAYS = 90


# 访客统计相关接口，管理员权限访问
@router.get("/overview")
async def get_overview(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    """Get visitor overview data (admin only)"""

    end_time = datetime.now(UTC)
    start_time = end_time - timedelta(days=days)

    # 1. Total visits
    result = await session.execute(
        select(func.count(VisitorTrack.id)).where(
            VisitorTrack.visit_time >= start_time
        )
    )
    total_visits = result.scalar() or 0

    # 2. Unique visitors (by IP)
    result = await session.execute(
        select(func.count(func.distinct(VisitorTrack.ip_address))).where(
            VisitorTrack.visit_time >= start_time
        )
    )
    unique_visitors = result.scalar() or 0

    # 3. Unique visitors (by visitor_id)
    result = await session.execute(
        select(func.count(func.distinct(VisitorTrack.visitor_id))).where(
            VisitorTrack.visit_time >= start_time
        )
    )
    unique_visitor_ids = result.scalar() or 0

    # 4. Top pages
    result = await session.execute(
        select(
            VisitorTrack.page_path,
            func.count(VisitorTrack.id).label("count"),
        )
        .where(VisitorTrack.visit_time >= start_time)
        .group_by(VisitorTrack.page_path)
        .order_by(func.count(VisitorTrack.id).desc())
        .limit(10)
    )
    top_pages = [
        {"page_path": row[0], "count": row[1]} for row in result.fetchall()
    ]

    # 5. Browser stats
    count_expr = func.count(VisitorTrack.id).label("count")
    result = await session.execute(
        select(
            VisitorTrack.browser_name,
            VisitorTrack.browser_version,
            count_expr,
        )
        .where(VisitorTrack.visit_time >= start_time)
        .group_by(VisitorTrack.browser_name, VisitorTrack.browser_version)
        .order_by(desc("count"))
    )
    browser_stats = [
        {"browser_name": row[0], "browser_version": row[1], "count": row[2]}
        for row in result.fetchall()
    ]

    # OS stats
    result = await session.execute(
        select(
            VisitorTrack.os_name,
            VisitorTrack.os_version,
            func.count(VisitorTrack.id).label("count"),
        )
        .where(VisitorTrack.visit_time >= start_time)
        .group_by(VisitorTrack.os_name, VisitorTrack.os_version)
        .order_by(func.count(VisitorTrack.id).desc())
    )
    os_stats = [
        {"os_name": row[0], "os_version": row[1], "count": row[2]}
        for row in result.fetchall()
    ]

    # Daily trend
    result = await session.execute(
        select(
            func.date(VisitorTrack.visit_time).label("date"),
            func.count(VisitorTrack.id).label("count"),
        )
        .where(VisitorTrack.visit_time >= start_time)
        .group_by(func.date(VisitorTrack.visit_time))
        .order_by(func.date(VisitorTrack.visit_time).desc())
    )
    daily_trend = [
        {"date": str(row[0]), "count": row[1]} for row in result.fetchall()
    ]

    return APIResponse.ok(
        data={
            "total_visits": total_visits,
            "unique_visitors": unique_visitors,
            "unique_visitor_ids": unique_visitor_ids,
            "top_pages": top_pages,
            "browser_stats": browser_stats,
            "os_stats": os_stats,
            "daily_trend": daily_trend,
            "period_days": days,
        },
        message="Visitor overview data retrieved successfully",
    )


@router.get("/visitors")
async def get_visitors(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    """Get visitor list with pagination (admin only)"""
    end_time = datetime.now(UTC)
    start_time = end_time - timedelta(days=days)

    # Get total count
    result = await session.execute(
        select(func.count(VisitorTrack.id)).where(
            VisitorTrack.visit_time >= start_time
        )
    )
    total = result.scalar() or 0

    # Pagination
    offset = (page - 1) * page_size

    # Get list
    result = await session.execute(
        select(VisitorTrack)
        .where(VisitorTrack.visit_time >= start_time)
        .order_by(VisitorTrack.visit_time.desc())
        .offset(offset)
        .limit(page_size)
    )
    visitors = result.scalars().all()

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
            "visit_time": v.visit_time.isoformat() if v.visit_time else None,
        }
        for v in visitors
    ]

    return APIResponse.ok(
        data={
            "list": visitor_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        },
        message="Visitor list retrieved successfully",
    )


@router.get("/user-logins")
async def get_user_logins(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    """Get user login logs with pagination (admin only)"""

    end_time = datetime.now(UTC)
    start_time = end_time - timedelta(days=days)

    # Get users with login records
    result = await session.execute(
        select(User).where(User.login_count > 0).order_by(User.id.desc())
    )
    users = result.scalars().all()

    # Filter users with recent logins
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

    # Pagination
    total = len(login_logs)
    offset = (page - 1) * page_size
    paginated_logs = login_logs[offset : offset + page_size]

    return APIResponse.ok(
        data={
            "list": paginated_logs,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        },
        message="User login logs retrieved successfully",
    )


@router.get("/server/status")
async def get_server_status(current_user: User = Depends(get_admin_user)):
    """获取服务器状态信息"""
    # 获取Cpu信息
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_cores = psutil.cpu_count(logical=True)
    # 获取内存信息
    mem = psutil.virtual_memory()
    mem_total = round(mem.total / 1024 / 1024)  # 总内存(MB)
    mem_used = round(mem.used / 1024 / 1024)  # 已用内存(MB)
    mem_usage = round(mem.percent, 2)  # 内存使用率(%)

    # 3. 获取磁盘信息（取根目录/）
    disk = psutil.disk_usage("/")
    disk_total = round(disk.total / 1024 / 1024 / 1024, 2)  # 总磁盘(GB)
    disk_used = round(disk.used / 1024 / 1024 / 1024, 2)  # 已用磁盘(GB)
    disk_usage = round(disk.percent, 2)  # 磁盘使用率(%)

    return APIResponse.ok(
        data={
            "cpu_percent": cpu_percent,
            "cpu_cores": cpu_cores,
            "mem_total": mem_total,
            "mem_used": mem_used,
            "mem_usage": mem_usage,
            "disk_total": disk_total,
            "disk_used": disk_used,
            "disk_usage": disk_usage,
        },
        message="Server status retrieved successfully",
    )


@router.get("/online-users")
async def get_online_users(
    include_user_details: bool = Query(
        False, description="是否包含用户详细信息"
    ),
    current_user: User = Depends(get_admin_user),
    redis: AsyncRedis = Depends(get_async_redis),
    session: AsyncSession = Depends(get_session),
):
    """获取当前在线用户统计（管理员权限）"""
    online_count = await redis.get("stats:online_count")
    online_count = int(online_count) if online_count else 0

    online_user_ids = await redis.zrange("online_users_z", 0, -1)
    online_user_ids = [int(uid.decode()) for uid in online_user_ids]

    user_details = []
    if include_user_details and online_user_ids:
        from sqlalchemy.orm import selectinload

        result = await session.execute(
            select(User)
            .where(User.id.in_(online_user_ids))
            .options(selectinload(User.profile))
        )
        users = result.scalars().all()
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

    return APIResponse.ok(
        data={
            "online_count": online_count,
            "online_user_ids": online_user_ids,
            "user_details": user_details,
        },
        message="在线用户数据获取成功",
    )


@router.get("/server/status/stream")
async def get_server_status_stream(
    current_user: User = Depends(get_admin_user),
):
    """流式返回服务器状态信息"""

    async def generate():
        while True:
            # 获取Cpu信息
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_cores = psutil.cpu_count(logical=True)
            # 获取内存信息
            mem = psutil.virtual_memory()
            mem_total = round(mem.total / 1024 / 1024)  # 总内存(MB)
            mem_used = round(mem.used / 1024 / 1024)  # 已用内存(MB)
            mem_usage = round(mem.percent, 2)  # 内存使用率(%)

            # 3. 获取磁盘信息（取根目录/）
            disk = psutil.disk_usage("/")
            disk_total = round(
                disk.total / 1024 / 1024 / 1024, 2
            )  # 总磁盘(GB)
            disk_used = round(
                disk.used / 1024 / 1024 / 1024, 2
            )  # 已用磁盘(GB)
            disk_usage = round(disk.percent, 2)  # 磁盘使用率(%)

            yield f"data: {json.dumps({'cpu_percent': cpu_percent, 'cpu_cores': cpu_cores, 'mem_total': mem_total, 'mem_used': mem_used, 'mem_usage': mem_usage, 'disk_total': disk_total, 'disk_used': disk_used, 'disk_usage': disk_usage})}\n\n"
            await asyncio.sleep(5)  # 每5秒发送一次数据

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
