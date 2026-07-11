from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.des.appstate import get_app_state
from app.api.des.auth import get_admin_user
from app.api.des.db import get_session
from app.appstate import AppState
from app.core.response import APIResponse
from app.models.models import User

router = APIRouter(prefix="/status", tags=["monitor-status"])

DEFAULT_DAYS = 7
MAX_DAYS = 90


@router.get("/overview")
async def get_overview(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
):
    payload = await state.monitor_svc.get_overview(session, days)

    return APIResponse(
        data=payload,
        message="Visitor overview data retrieved successfully",
    )


@router.get("/visitors")
async def get_visitors(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
):
    payload = await state.monitor_svc.get_visitors(session, days, page, page_size)

    return APIResponse(
        data=payload,
        message="Visitor list retrieved successfully",
    )


@router.get("/user-logins")
async def get_user_logins(
    days: int = Query(DEFAULT_DAYS, ge=1, le=MAX_DAYS, description="统计天数"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
):
    payload = await state.monitor_svc.get_user_logins(session, days, page, page_size)

    return APIResponse(
        data=payload,
        message="User login logs retrieved successfully",
    )


@router.get("/server/status")
async def get_server_status(
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
):
    payload = await state.monitor_svc.get_server_status()

    return APIResponse(
        data=payload,
        message="Server status retrieved successfully",
    )


@router.get("/server/status/stream", response_class=EventSourceResponse)
async def get_server_status_stream(
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
):
    async for data in state.monitor_svc.stream_server_status():
        yield data
