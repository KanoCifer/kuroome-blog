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

import httpx
from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.des.auth import manager
from app.api.des.db import get_session
from app.models.models import User
from app.schemas.response import APIResponse
from app.tasks import import_books_from_weread

router = APIRouter(
    prefix="/import",
    tags=["weread"],
    responses={401: {"description": "Unauthorized"}},
)


class ImportBooksIn:
    """Import books from WeRead input schema."""

    def __init__(self, weread_cookie: str) -> None:
        self.weread_cookie = weread_cookie


@router.post("")
async def import_books(
    data: dict,
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
    user_agent: str | None = Header(None),
):
    """异步从微信读书获取笔记并导入 (需要登录).

    - 使用 `httpx.AsyncClient` 异步拉取 weread API
    - 在后台线程执行同步的 DB 写入 (`import_books_from_weread`)

    Args:
        data: Request body containing weread_cookie
        user: Current authenticated user (injected by login_required)
        db: Database session

    Returns:
        API response with imported books count or error
    """
    cookie: str | None = data.get("weread_cookie")
    if not cookie or not cookie.strip():
        return APIResponse.error(
            message="weread_cookie is required",
            code=status.HTTP_400_BAD_REQUEST,
        )

    cookie = cookie.strip()
    headers = {
        "User-Agent": user_agent or "ReadingList/2.0",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Cookie": cookie,
    }

    api_url = "https://weread.qq.com/api/user/notebook"

    try:
        timeout = httpx.Timeout(15.0)
        async with httpx.AsyncClient(
            timeout=timeout, headers=headers
        ) as client:
            resp = await client.get(api_url)
            resp.raise_for_status()
            book_data = resp.json()
    except httpx.ConnectError:
        return APIResponse.error(
            message="Network unreachable. Please check server internet connection or proxy settings.",
            code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except httpx.HTTPError as exc:  # 包含超时、HTTP 错误等
        return APIResponse.error(
            message=f"Failed to import books: {exc}",
            code=status.HTTP_502_BAD_GATEWAY,
        )

    user_id = user.id
    task = await import_books_from_weread.kiq(book_data, user_id)
    result = await task.wait_result()
    count = result.get("imported_count", 0) if isinstance(result, dict) else 0

    return APIResponse.ok(
        data={"imported_count": count},
        message=f"Successfully imported {count} books.",
    )
