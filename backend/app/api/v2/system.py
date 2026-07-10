from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.api.des.des import system_service_dep
from app.core.response import APIResponse
from app.services.system import SystemService

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/")
async def system():
    """轻量探活，不做鉴权。"""
    return {"status": "ok"}


@router.get("/log")
async def get_log(
    page: int = Query(1, ge=1, description="页码，从 1 开始"),
    per_page: int = Query(
        10, ge=1, le=200, description="每页条数，默认最近 10 条"
    ),
    type: str | None = Query(
        None, description="按事件类型过滤，如 startup / deploy"
    ),
    start: datetime | None = Query(
        None, description="起始时间（含），ISO 8601"
    ),
    end: datetime | None = Query(None, description="截止时间（含），ISO 8601"),
    service: SystemService = Depends(system_service_dep),
):
    """分页查询服务事件，按时间倒序，默认返回最近 10 条。"""
    items, pagination = await service.list_events(
        page=page,
        per_page=per_page,
        type=type,
        start=start,
        end=end,
    )
    return APIResponse(
        data={"items": items, "pagination": pagination},
        message="获取事件列表成功",
    )
