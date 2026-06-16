from __future__ import annotations

import re

from app.core.logger import logger
from app.models.weread import Archive, UserBook, WereadBook
from app.services.weread.base import WereadBaseService
from app.services.weread.utils import map_book_info, parse_shelf_books


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

    async def get_book_info(self, book_id: str, user_id: int | None = None):
        """获取书籍信息，本地优先，miss 时从远端拉取并缓存。

        Args:
            book_id: 微信读书 bookId
            user_id: 提供 user_id 时，本地 miss 可触发远端拉取
        """
        book = await self.repo.get_book_info(book_id)
        if book:
            return book
        # 本地 miss：有 user_id 才能调远端
        if user_id is None:
            raise ValueError("书籍信息不存在")
        try:
            raw = await self._send_http_request(
                user_id=user_id,
                api_name="/book/info",
                extra={"bookId": book_id},
            )
        except ValueError:
            raise ValueError("书籍信息不存在") from None
        info = map_book_info(raw)
        weread_book = WereadBook(**info)
        await weread_book.insert()
        logger.info(f"[book-info] lazy fetch & cached: bookId={book_id}")
        return weread_book

    # ── 书架 ──────────────────────────────────────────────────────

    async def get_user_shelf(self, user_id: int):
        """实时获取用户书架：代理 /shelf/sync，顺手持久化到 MongoDB。

        返回 (books_data, archives_data)，供 API 层直接返回。
        """
        raw = await self._send_http_request(
            user_id=user_id, api_name="/shelf/sync"
        )
        shelf_books, archives = parse_shelf_books(raw)

        # 顺便持久化（不阻塞返回，但当前是同步写）
        await self._persist_shelf(user_id, shelf_books, archives)

        # 返回给前端的扁平结构
        book_data = [
            {
                "bookId": b["bookId"],
                "title": b.get("title"),
                "author": b.get("author"),
                "cover": b.get("cover"),
                "category": b.get("category"),
                "readUpdateTime": b.get("readUpdateTime"),
                "updateTime": b.get("updateTime"),
                "finishReading": b.get("finishReading", False),
                "secret": b.get("secret", False),
                "isTop": b.get("isTop", False),
            }
            for b in shelf_books
        ]
        return book_data, archives

    async def save_user_book(self, user_book_info):
        return await self.repo.save_user_book(user_book_info)

    async def save_user_archive(self, archive_info):
        return await self.repo.save_user_archive(archive_info)

    async def sync_my_books(self, user_id: int):
        """从微信读书同步书架（全量导入场景）。

        与 get_user_shelf 不同，此接口主要做持久化，返回导入数量。
        不再批量拉 /book/info，详情改为按需获取。
        """
        raw = await self._send_http_request(
            user_id=user_id, api_name="/shelf/sync"
        )
        shelf_books, archives = parse_shelf_books(raw)
        logger.info(
            f"[sync] user={user_id} shelf books={len(shelf_books)}, archives={len(archives)}"
        )

        if not shelf_books:
            return 0

        # 持久化
        await self._persist_shelf(user_id, shelf_books, archives)
        return len(shelf_books)

    # ── 内部：持久化书架到 MongoDB ────────────────────────────

    async def _persist_shelf(
        self,
        user_id: int,
        shelf_books: list[dict],
        archives: list[dict],
    ) -> None:
        """将书架数据写入 MongoDB（UserBook + Archive）。"""
        # 1. 构建 UserBook
        user_books = [
            UserBook(
                user_id=user_id,
                bookId=b["bookId"],
                title=b.get("title"),
                author=b.get("author"),
                cover=b.get("cover"),
                category=b.get("category"),
                readUpdateTime=b.get("readUpdateTime"),
                updateTime=b.get("updateTime"),
                finishReading=b.get("finishReading", False),
                secret=b.get("secret", False),
                isTop=b.get("isTop", False),
                readProgress=None,
            )
            for b in shelf_books
        ]
        await self.repo.save_user_books_bulk(user_books)

        # 2. 保存书单
        archive_docs = [Archive(**a) for a in archives]
        await self.repo.save_user_archives_bulk(archive_docs)

        logger.info(
            f"[persist] user={user_id} books={len(user_books)}, archives={len(archive_docs)}"
        )
