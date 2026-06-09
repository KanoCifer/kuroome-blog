from app.models.weread import WereadBook


class BookRepo:
    """WereadBook CRUD"""

    async def save_books_bulk(
        self, books: list[WereadBook]
    ) -> dict[str, WereadBook]:
        """批量保存书籍，以 _id (= bookId) 去重，返回 bookId → WereadBook 映射

        已有记录：跳过（增量同步默认不覆盖）
        新记录：insert()，DuplicateKey 时回退为查找已有文档
        """
        if not books:
            return {}

        # 一次查出已有 _id，跳过已存在书籍
        book_ids = [b.id for b in books]
        existing = await WereadBook.find(
            {"_id": {"$in": book_ids}}
        ).to_list()
        existing_ids = {b.id for b in existing}

        book_map: dict[str, WereadBook] = {}
        # 已有文档直接加入映射
        for doc in existing:
            book_map[doc.id] = doc

        # 只保存新增书籍
        new_books = [b for b in books if b.id not in existing_ids]
        for book in new_books:
            try:
                await book.insert()
            except Exception:
                # 极端竞态：另一请求已插入，查找已有文档
                doc = await WereadBook.find_one({"_id": book.id})
                if doc:
                    book.id = doc.id
            book_map[book.id] = book

        return book_map

    async def get_book_info(self, book_id) -> WereadBook | None:
        """获取书籍信息"""
        return await WereadBook.find_one({"_id": book_id})
