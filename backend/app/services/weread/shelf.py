from __future__ import annotations

import re

from app.services.weread.base import WereadBaseService


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

    def _parse_book_data(self, raw):
        books = raw.get("books", [])
        archives = raw.get("archives", [])
        parsed_books = [
            {
                "bookId": book.get("bookId"),
                "title": book.get("title"),
                "author": book.get("author"),
                "cover": book.get("cover"),
                "readUpdateTime": book.get("readUpdateTime"),
                "finishReading": book.get("finishReading"),
                "secret": book.get("secret"),
            }
            for book in books
        ]
        return parsed_books, archives

    async def sync_my_books(self, user_id: int):
        """从微信读书同步书架并保存到数据库"""
        raw = await self._send_http_request(
            user_id=user_id, api_name="/shelf/sync"
        )
        books_data, archives = self._parse_book_data(raw)

        from app.models.weread import Archive, UserBook, WereadBook

        weread_books = [WereadBook(**b) for b in books_data]
        await self.repo.save_books_bulk(weread_books)

        book_map = await self.repo.get_book_map_by_ids(
            [b.bookId for b in weread_books]
        )

        user_books = [
            UserBook(
                user_id=user_id,
                bookId=b["bookId"],
                readUpdateTime=b.get("readUpdateTime"),
                finishReading=b.get("finishReading", False),
                secret=b.get("secret", False),
                readProgress=None,
            )
            for b in books_data
        ]
        await self.repo.save_user_books_bulk(user_books, book_map=book_map)

        archive_docs = [Archive(**a) for a in archives]
        await self.repo.save_user_archives_bulk(archive_docs)

        return len(books_data)
