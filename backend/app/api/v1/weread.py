"""WeRead import router for FastAPI.

This module provides WeRead import endpoints migrated from
backend/watchlist/api/weread.py to FastAPI.

Endpoints:
    - POST /api/import - Import books from WeRead

Dependencies:
    - httpx.AsyncClient: For async HTTP requests to WeRead API
    - motor: For async MongoDB operations
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, status

from app.api.des.auth import manager
from app.api.des.des import weread_service_dep
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.weread import ImportBooksIn
from app.services.weread_service import WereadService

router = APIRouter(
    prefix="/import",
    tags=["weread"],
    responses={401: {"description": "Unauthorized"}},
)


@router.post("")
async def import_books(
    data: ImportBooksIn,
    user: User = Depends(manager),
    user_agent: str | None = Header(None),
    weread_service: WereadService = Depends(weread_service_dep),
):
    """异步从微信读书获取笔记并导入 (需要登录).

    - 使用 `httpx.AsyncClient` 异步拉取 weread API

    Args:
        data: Request body containing weread_cookie
        user: Current authenticated user (injected by login_required)
        db: Database session

    Returns:
        API response with imported books count or error
    """
    cookie: str | None = data.weread_cookie
    if not cookie or not cookie.strip():
        return APIResponse.error(
            message="weread_cookie is required",
            code=status.HTTP_400_BAD_REQUEST,
        )

    cookie = cookie.strip()
    count = await weread_service.import_books(cookie, user.id, user_agent)

    return APIResponse.ok(
        data={"imported_count": count},
        message=f"Successfully imported {count} books.",
    )
