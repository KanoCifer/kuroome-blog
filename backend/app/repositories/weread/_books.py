from beanie import BulkWriter
from pymongo import InsertOne

from app.models.weread import WereadBook
from app.repositories.weread._upsert import upsert


class BookRepo:
    """WereadBook CRUD"""

    async def save_books_bulk(
        self, books: list[WereadBook]
    ) -> dict[str, WereadBook]:
        """批量保存书籍，按 bookId 去重，并返回 bookId → WereadBook 映射"""
        book_ids = [b.bookId for b in books]
        existing = await WereadBook.find(
            {"_id": {"$in": book_ids}}
        ).to_list()
        existing_map = {b.bookId: b for b in existing}

        book_map = {}
        new_books = []
        for book in books:
            if book.bookId in existing_map:
                doc = existing_map[book.bookId]
                update_data = book.model_dump(exclude={"id"})
                for field, value in update_data.items():
                    setattr(doc, field, value)
                await doc.save()
                book_map[book.bookId] = doc
            else:
                new_books.append(book)
                book_map[book.bookId] = book

        if new_books:
            async with BulkWriter() as bulk:
                for book in new_books:
                    bulk.add_operation(WereadBook, InsertOne(book.model_dump(exclude={"id"})))

        return book_map

    async def save_book_info(self, book_info) -> WereadBook:
        """保存书籍信息"""
        book = WereadBook(**book_info)
        return await upsert(book, WereadBook.find_one({"_id": book.bookId}))

    async def get_book_info(self, book_id) -> WereadBook | None:
        """获取书籍信息"""
        book = await WereadBook.find_one({"_id": book_id})
        return book
