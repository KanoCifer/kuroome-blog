from __future__ import annotations

import re

from beanie import Link, WriteRules

from app.models.weread import Archive, UserBook, WereadBook
from app.services.weread.base import WereadBaseService
from app.services.weread.utils import _map_book_info, _parse_shelf_books


class WereadShelfService(WereadBaseService):
    """微信读书书架同步服务"""

    # ── 用户信息 ──────────────────────────────────────────────────

    async def get_user_info(self, user_id: int):
        user = await self.repo.get_user_info(user_id)
        if not user:
            raise ValueError("用户信息不存在")
        return user

    async def save_user_info(self, user_id: int, api_key: str):
        if not api_key or not re.match(r"^wrk\-", api_key):
            raise ValueError("无效的API Key格式")
        return await self.repo.save_user_info(user_id, api_key)

    # ── 书籍信息 ──────────────────────────────────────────────────

    async def get_book_info(self, book_id: str):
        book = await self.repo.get_book_info(book_id)
        if not book:
            raise ValueError("书籍信息不存在")
        return book

    # ── 书架 ──────────────────────────────────────────────────────

    async def get_user_shelf(self, user_id: int):
        return await self.repo.get_user_shelf(user_id)

    async def save_user_book(self, user_book_info):
        return await self.repo.save_user_book(user_book_info)

    async def save_user_archive(self, archive_info):
        return await self.repo.save_user_archive(archive_info)

    async def sync_my_books(self, user_id: int):
        """从微信读书同步书架：先调 /shelf/sync 获取书单，再逐本调 /book/info 获取详情，
        最后通过 link_rule=WriteRules.WRITE 级联写入 WereadBook 和 UserBook"""
        # 1. 同步书架，获取 bookId 列表和书架特有字段
        raw = await self._send_http_request(
            user_id=user_id, api_name="/shelf/sync"
        )
        shelf_books, archives = _parse_shelf_books(raw)

        if not shelf_books:
            return 0

        # 2. 逐本获取详细信息
        detailed_books = []
        for b in shelf_books:
            book_id = b["bookId"]
            try:
                info = await self._send_http_request(
                    user_id=user_id,
                    api_name="/book/info",
                    extra={"bookId": book_id},
                )
                detailed_books.append(_map_book_info(info))
            except ValueError:
                # 某本书获取详情失败时，用书架基础信息兜底
                detailed_books.append(
                    {
                        "bookId": book_id,
                        "title": b.get("title"),
                        "author": b.get("author"),
                        "cover": b.get("cover"),
                    }
                )

        # 3. 构建 WereadBook（含完整详情）并批量保存
        weread_books = [WereadBook(**info) for info in detailed_books]
        book_map = await self.repo.save_books_bulk(weread_books)

        # 4. 构建 UserBook，通过 Link + WriteRules.WRITE 级联写入
        user_books = []
        for b in shelf_books:
            ub = UserBook(
                user_id=user_id,
                bookId=b["bookId"],
                readUpdateTime=b.get("readUpdateTime"),
                finishReading=b.get("finishReading", False),
                secret=b.get("secret", False),
                isTop=b.get("isTop", False),
                readProgress=None,
            )
            if b["bookId"] in book_map:
                ub.bookInfo = Link(
                    book_map[b["bookId"]], link_rule=WriteRules.WRITE
                )
            user_books.append(ub)

        await self.repo.save_user_books_bulk(user_books, book_map=book_map)

        # 5. 保存书单
        archive_docs = [Archive(**a) for a in archives]
        await self.repo.save_user_archives_bulk(archive_docs)

        return len(shelf_books)
