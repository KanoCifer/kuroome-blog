from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

import httpx
from apiflask import Schema
from apiflask.fields import String
from flask import current_app
from flask_login import current_user, login_required

from watchlist.api import api
from watchlist.api.utils import APIResponse
from watchlist.extensions import db
from watchlist.models import Book, UserBook


def import_books_from_weread(book_data: dict, user_id: int) -> int:
    """把解析后的微信读书数据写入数据库 (同步)。

    在异步视图中应通过 `asyncio.to_thread` 调用本函数以避免阻塞事件循环。
    """
    imported_count = 0
    for item in book_data.get("books", []):
        data = item.get("book", {})
        bookid = data.get("bookId")

        book = db.session.execute(
            db.select(Book).filter_by(bookid=bookid)
        ).scalar()

        if not book:
            book = Book(
                title=data.get("title", "未知书名"),
                author=data.get("author", "未知作者"),
                bookid=bookid,
                cover=data.get("cover"),
            )
            db.session.add(book)
            db.session.flush()  # 获取 book.id

        # 检查该用户是否已经添加了这本书
        user_book = db.session.execute(
            db.select(UserBook).filter_by(user_id=user_id, book_id=book.id)
        ).scalar()

        if not user_book:
            user_book = UserBook(
                user_id=user_id,
                book_id=book.id,
                iscompleted=False,
                add_date=datetime.now(UTC),
            )
            db.session.add(user_book)
            imported_count += 1

    db.session.commit()
    return imported_count


class ImportBooksInSchema(Schema):
    weread_cookie = String(required=True)


@api.post("/import")
@api.input(ImportBooksInSchema, location="json")
@login_required
async def import_books(json_data: dict) -> tuple[Any, int]:
    """异步从微信读书获取笔记并导入 (需要登录)。

    - 使用 `httpx.AsyncClient` 异步拉取 weread API
    - 在后台线程执行同步的 DB 写入 (`import_books_from_weread`)
    """
    cookie: str | None = json_data.get("weread_cookie")
    if not cookie or not cookie.strip():
        return APIResponse.error_response(
            "weread_cookie is required", code=400
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
        return APIResponse.error_response(
            "Network unreachable. Please check server internet connection or proxy settings.",
            code=503,
        )
    except httpx.HTTPError as exc:  # 包含超时、HTTP 错误等
        current_app.logger.exception("weread fetch failed")
        return APIResponse.error_response(
            f"Failed to import books: {exc}", code=502
        )

    # 把同步的 DB 写入放到后台线程执行，避免阻塞事件循环
    user_id = current_user.id
    imported_count = await asyncio.to_thread(
        import_books_from_weread, book_data, user_id
    )

    return APIResponse.api_response(
        data={"imported_count": imported_count},
        message=f"Successfully imported {imported_count} books.",
    )
    """获取当前用户的所有书籍信息"""
    user_books = db.session.execute(
        db.select(UserBook).filter_by(user_id=current_user.id)
    ).scalars()
    book_ids = [ub.book_id for ub in user_books]
    books = db.session.execute(
        db.select(Book).filter(Book.id.in_(book_ids))
    ).scalars()
    return APIResponse.api_response(
        data=[
            {
                "id": book.id,
                "title": book.title,
                "author": book.author,
                "cover": book.cover,
                "iscompleted": ub.iscompleted
                if (
                    ub := next(
                        (ub for ub in user_books if ub.book_id == book.id),
                        None,
                    )
                )
                else False,
            }
            for book in books
        ]
    )
