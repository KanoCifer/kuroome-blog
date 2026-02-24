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

import asyncio
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import manager
from app.dependencies.database import get_session
from app.models.models import Book, User, UserBook
from app.schemas.response import APIResponse

router = APIRouter(
    prefix="/import",
    tags=["weread"],
    responses={401: {"description": "Unauthorized"}},
)


async def import_books_from_weread(book_data: dict, user_id: int):
    """把解析后的微信读书数据写入数据库 (同步).

    在异步视图中应通过 `asyncio.to_thread` 调用本函数以避免阻塞事件循环。

    Args:
        book_data: 微信读书 API 返回的书籍数据
        user_id: 用户 ID

    Returns:
        导入的书籍数量
    """
    # Import models inside function to avoid circular imports
    async for db in get_session():
        imported_count = 0
        for item in book_data.get("books", []):
            data = item.get("book", {})
            bookid = data.get("bookId")

            result = await db.execute(select(Book).filter_by(bookid=bookid))
            book = result.scalar()

            if not book:
                book = Book(
                    title=data.get("title", "未知书名"),
                    author=data.get("author", "未知作者"),
                    bookid=bookid,
                    cover=data.get("cover"),
                )
                db.add(book)
                await db.flush()  # 获取 book.id

            # 检查该用户是否已经添加了这本书
            result = await db.execute(
                select(UserBook).filter_by(user_id=user_id, book_id=book.id)
            )
            user_book = result.scalar()

            if not user_book:
                user_book = UserBook(
                    user_id=user_id,
                    book_id=book.id,
                    iscompleted=False,
                    add_date=datetime.now(UTC),
                )
                db.add(user_book)
                imported_count += 1

        await db.commit()
        return imported_count


class ImportBooksIn:
    """Import books from WeRead input schema."""

    def __init__(self, weread_cookie: str) -> None:
        self.weread_cookie = weread_cookie


@router.post("")
async def import_books(
    data: dict,
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
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
        "User-Agent": "ReadingList/1.0 (+https://example.com)",
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

    # 把同步的 DB 写入放到后台线程执行，避免阻塞事件循环
    user_id = user.id
    imported_count = await asyncio.to_thread(
        import_books_from_weread, book_data, user_id
    )

    return APIResponse.ok(
        data={"imported_count": imported_count},
        message=f"Successfully imported {imported_count} books.",
    )
