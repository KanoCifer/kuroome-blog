from beanie import Link, WriteRules

from app.models.weread import UserBook, WereadBook
from app.repositories.weread._upsert import upsert


class UserBookRepo:
    """UserBook CRUD"""

    async def save_user_books_bulk(
        self,
        user_books: list[UserBook],
        book_map: dict[str, WereadBook] | None = None,
    ) -> list[UserBook]:
        """批量保存用户书籍，按 (user_id, bookId) 去重

        Args:
            user_books: 用户书籍列表
            book_map: bookId → WereadBook 映射，用于设置 Link 关联
        """
        if not user_books:
            return []

        conditions = [
            {
                "user_id": ub.user_id,
                "bookId": ub.bookId,
            }
            for ub in user_books
        ]
        existing = await UserBook.find({"$or": conditions}).to_list()
        existing_map = {(ub.user_id, ub.bookId): ub for ub in existing}

        new_books = []
        updated = []
        for ub in user_books:
            if book_map and ub.bookId in book_map:
                ub.bookInfo = Link(
                    book_map[ub.bookId], link_rule=WriteRules.WRITE
                )
            if (ub.user_id, ub.bookId) in existing_map:
                doc = existing_map[(ub.user_id, ub.bookId)]
                doc.readUpdateTime = ub.readUpdateTime
                doc.finishReading = ub.finishReading
                doc.secret = ub.secret
                doc.isTop = ub.isTop
                if book_map and ub.bookId in book_map:
                    doc.bookInfo = Link(
                        book_map[ub.bookId], link_rule=WriteRules.WRITE
                    )
                await doc.save(link_rule=WriteRules.WRITE)
                updated.append(doc)
            else:
                new_books.append(ub)

        if new_books:
            for ub in new_books:
                await ub.save(link_rule=WriteRules.WRITE)
        return updated + new_books

    async def save_user_book(self, user_book_info) -> UserBook:
        """保存用户书籍信息"""
        user_book = UserBook(**user_book_info)
        find_one = UserBook.find_one(
            (UserBook.user_id == user_book.user_id)
            & (UserBook.bookId == user_book.bookId)
        )
        return await upsert(user_book, find_one, link_rule=WriteRules.WRITE)
