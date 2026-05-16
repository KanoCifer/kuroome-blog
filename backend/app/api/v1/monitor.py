from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.des.auth import get_admin_user
from app.api.des.des import monitor_service_dep
from app.models.models import User
from app.schemas.response import APIResponse
from app.services.monitor_service import MonitorDomainError, MonitorService

router = APIRouter(prefix="/status", tags=["monitor-status"])

DEFAULT_DAYS = 7
MAX_DAYS = 90


@router.get("/overview")
async def get_overview(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    current_user: User = Depends(get_admin_user),
    monitor_service: MonitorService = Depends(monitor_service_dep),
):
    try:
        payload = await monitor_service.get_overview(days)
    except MonitorDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data=payload,
        message="Visitor overview data retrieved successfully",
    )


@router.get("/visitors")
async def get_visitors(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_admin_user),
    monitor_service: MonitorService = Depends(monitor_service_dep),
):
    try:
        payload = await monitor_service.get_visitors(days, page, page_size)
    except MonitorDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data=payload,
        message="Visitor list retrieved successfully",
    )


@router.get("/user-logins")
async def get_user_logins(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_admin_user),
    monitor_service: MonitorService = Depends(monitor_service_dep),
):
    try:
        payload = await monitor_service.get_user_logins(days, page, page_size)
    except MonitorDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data=payload,
        message="User login logs retrieved successfully",
    )


@router.get("/server/status")
async def get_server_status(
    current_user: User = Depends(get_admin_user),
    monitor_service: MonitorService = Depends(monitor_service_dep),
):
    try:
        payload = await monitor_service.get_server_status()
    except MonitorDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data=payload,
        message="Server status retrieved successfully",
    )


@router.get("/server/status/stream")
async def get_server_status_stream(
    current_user: User = Depends(get_admin_user),
    monitor_service: MonitorService = Depends(monitor_service_dep),
):
    event_generator = monitor_service.stream_server_status()

    return StreamingResponse(
        event_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
