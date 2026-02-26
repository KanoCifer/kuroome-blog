from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.database import get_session
from app.models.models import User, VisitorTrack
from app.routers.admin import get_admin_user
from app.schemas.response import APIResponse

router = APIRouter(prefix="/status", tags=["monitor-status"])

DEFAULT_DAYS = 7
MAX_DAYS = 90


@router.get("/overview")
async def get_overview(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    """Get visitor overview data (admin only)"""
    from datetime import UTC, datetime

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
    result = await session.execute(
        select(
            VisitorTrack.browser,
            func.count(VisitorTrack.id).label("count"),
        )
        .where(VisitorTrack.visit_time >= start_time)
        .group_by(VisitorTrack.browser)
        .order_by(func.count(VisitorTrack.id).desc())
    )
    browser_stats = [
        {"browser": row[0], "count": row[1]} for row in result.fetchall()
    ]

    # 6. Daily trend
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
    from datetime import UTC, datetime

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
    from datetime import UTC, datetime

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
