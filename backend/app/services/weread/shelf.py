from __future__ import annotations

import asyncio
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

    async def get_book_info(self, book_id: str):
        book = await self.repo.get_book_info(book_id)
        if not book:
            raise ValueError("书籍信息不存在")
        return book

    # ── 书架 ──────────────────────────────────────────────────────

    async def get_user_shelf(self, user_id: int):
        user_books, archives = await self.repo.get_user_shelf(user_id)
        # 把 bookInfo 嵌套字段拍平到顶层，匹配前端 WereadUserBook 扁平契约
        book_data = []
        for b in user_books:
            data = b.model_dump(mode="json", by_alias=True)
            info = data.pop("bookInfo", None) or {}
            data.update(info)
            book_data.append(data)
        return book_data, archives

    async def save_user_book(self, user_book_info):
        return await self.repo.save_user_book(user_book_info)

    async def save_user_archive(self, archive_info):
        return await self.repo.save_user_archive(archive_info)

    async def sync_my_books(self, user_id: int, force: bool = False):
        """从微信读书同步书架

        Args:
            user_id: 用户ID
            force: True 时强制重新拉取所有书籍详情；False 时跳过已有书籍
        """
        # 1. 同步书架，获取 bookId 列表和书架特有字段
        raw = await self._send_http_request(
            user_id=user_id, api_name="/shelf/sync"
        )
        shelf_books, archives = parse_shelf_books(raw)
        logger.info(
            f"[sync] user={user_id} shelf books={len(shelf_books)}, archives={len(archives)}"
        )

        if not shelf_books:
            return 0

        # 2. 增量：跳过已有书籍，仅拉取新增
        all_book_ids = [b["bookId"] for b in shelf_books]
        if not force:
            existing = await WereadBook.find(
                {"bookId": {"$in": all_book_ids}}
            ).to_list()
            existing_ids = {b.id for b in existing}
            new_shelf = [
                b for b in shelf_books if b["bookId"] not in existing_ids
            ]
            logger.info(
                f"[sync] user={user_id} total={len(shelf_books)}, existing={len(existing_ids)}, new={len(new_shelf)}"
            )
        else:
            new_shelf = shelf_books
            existing_ids: set[str] = set()

        # 3. 全量时或新增书籍：并发获取书籍详情
        if new_shelf:
            sem = asyncio.Semaphore(15)

            async def _fetch_book(b: dict):
                book_id = b["bookId"]
                try:
                    async with sem:
                        info = await self._send_http_request(
                            user_id=user_id,
                            api_name="/book/info",
                            extra={"bookId": book_id},
                        )
                    return map_book_info(info)
                except ValueError:
                    logger.warning(
                        f"[sync] book info failed, bookId={book_id}, using fallback"
                    )
                    return {
                        "bookId": book_id,
                        "title": b.get("title"),
                        "author": b.get("author"),
                        "cover": b.get("cover"),
                    }

            detailed_books = await asyncio.gather(
                *[_fetch_book(b) for b in new_shelf]
            )

            # 4. 保存新增 WereadBook
            weread_books = [WereadBook(**info) for info in detailed_books]
            new_book_map = await self.repo.save_books_bulk(weread_books)
            logger.info(
                f"[sync] saved WereadBook: {len(new_book_map)} new books"
            )
        else:
            new_book_map = {}

        # 5. 已有书籍也需加入 book_map（用于 UserBook Link）
        if not force:
            existing_books = await WereadBook.find(
                {"bookId": {"$in": list(existing_ids)}}
            ).to_list()
            book_map = {b.id: b for b in existing_books}
            book_map.update(new_book_map)
        else:
            book_map = new_book_map

        # 6. 构建 UserBook
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
                ub.bookInfo = book_map[b["bookId"]]  # type: ignore[assignment]
            user_books.append(ub)

        saved = await self.repo.save_user_books_bulk(
            user_books, book_map=book_map
        )
        logger.info(f"[sync] saved UserBook: {len(saved)} books")

        # 7. 保存书单
        archive_docs = [Archive(**a) for a in archives]
        await self.repo.save_user_archives_bulk(archive_docs)

        return len(shelf_books)
