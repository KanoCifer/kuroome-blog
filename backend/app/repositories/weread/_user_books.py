from pymongo.errors import DuplicateKeyError

from app.core.logger import logger
from app.models.weread import ReadProgress, UserBook


class UserBookRepo:
    """UserBook CRUD"""

    async def save_user_books_bulk(
        self,
        user_books: list[UserBook],
        book_map: dict | None = None,
    ) -> list[UserBook]:
        """批量保存用户书籍，按 (user_id, bookId) 去重

        - 已有记录：就地更新字段后 save()
        - 新记录：逐本 insert()，DuplicateKey 时回退为更新
        """
        if not user_books:
            return []

        conditions = [
            {"user_id": ub.user_id, "bookId": ub.bookId} for ub in user_books
        ]
        existing = await UserBook.find({"$or": conditions}).to_list()
        existing_map = {(ub.user_id, ub.bookId): ub for ub in existing}

        updated = []
        new_books: list[UserBook] = []
        for ub in user_books:
            if book_map and ub.bookId in book_map:
                ub.bookInfo = book_map[ub.bookId]  # type: ignore[assignment]
            key = (ub.user_id, ub.bookId)
            if key in existing_map:
                doc = existing_map[key]
                doc.readUpdateTime = ub.readUpdateTime
                doc.finishReading = ub.finishReading
                doc.secret = ub.secret
                doc.isTop = ub.isTop
                if book_map and ub.bookId in book_map:
                    doc.bookInfo = book_map[ub.bookId]  # type: ignore[assignment]
                await doc.save()
                updated.append(doc)
            else:
                new_books.append(ub)

        inserted = []
        for ub in new_books:
            try:
                await ub.insert()
                inserted.append(ub)
            except DuplicateKeyError:
                # 极端竞态：insert 期间另一请求已写入，回退为更新
                existing_doc = await UserBook.find_one(
                    UserBook.user_id == ub.user_id,
                    UserBook.bookId == ub.bookId,
                )
                if existing_doc:
                    existing_doc.readUpdateTime = ub.readUpdateTime
                    existing_doc.finishReading = ub.finishReading
                    existing_doc.secret = ub.secret
                    existing_doc.isTop = ub.isTop
                    if book_map and ub.bookId in book_map:
                        existing_doc.bookInfo = book_map[ub.bookId]  # type: ignore[assignment]
                    await existing_doc.save()
                    inserted.append(existing_doc)
                    logger.warning(
                        f"[sync] DuplicateKey on UserBook user={ub.user_id} book={ub.bookId}, upserted"
                    )
        logger.info(
            f"[sync] UserBook: {len(updated)} updated, {len(inserted)} inserted"
        )

        return updated + inserted

    async def save_user_book(self, user_book_info) -> UserBook:
        """保存用户书籍信息"""
        user_book = UserBook(**user_book_info)
        find_one = UserBook.find_one(
            (UserBook.user_id == user_book.user_id)
            & (UserBook.bookId == user_book.bookId)
        )
        existing = await find_one
        if existing:
            user_book.id = existing.id
            await user_book.save()
        else:
            try:
                await user_book.insert()
            except DuplicateKeyError:
                existing = await UserBook.find_one(
                    (UserBook.user_id == user_book.user_id)
                    & (UserBook.bookId == user_book.bookId)
                )
                if existing:
                    user_book.id = existing.id
                    await user_book.save()
        return user_book

    async def save_book_progress(
        self, bookId: str, user_id: int, progress: ReadProgress
    ) -> bool:
        """用 $set 局部更新 readProgress,避免整文档重写。

        Returns: True 表示有文档被修改;False 表示书不在用户书架上。
        """
        result = await UserBook.find_one(
            UserBook.user_id == user_id,
            UserBook.bookId == bookId,
        ).update_one(
            {"$set": {"readProgress": progress.model_dump(mode="json")}}
        )
        return result.modified_count > 0

    async def get_book_progress(
        self, bookId: str, user_id: int
    ) -> ReadProgress | None:
        """获取书籍阅读进度;书不在书架上返回 None。"""
        user_book = await UserBook.find_one(
            UserBook.user_id == user_id,
            UserBook.bookId == bookId,
        )
        return user_book.readProgress if user_book else None
