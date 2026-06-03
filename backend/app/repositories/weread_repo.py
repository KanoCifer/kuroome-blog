from app.core.logger import logger
from app.models.weread import Archive, User, UserBook, WereadBook


class WereadRepo:
    """微信读书数据访问类"""

    def __init__(self, session) -> None:
        self.session = session

    async def save_books_bulk(
        self, books: list[WereadBook]
    ) -> list[WereadBook]:
        """批量保存书籍，按 bookId 去重"""
        book_ids = [b.bookId for b in books]
        existing = await WereadBook.find(
            {"bookId": {"$in": book_ids}}
        ).to_list()
        existing_map = {b.bookId: b for b in existing}

        result = []
        for book in books:
            if book.bookId in existing_map:
                doc = existing_map[book.bookId]
                doc.title = book.title
                doc.author = book.author
                doc.cover = book.cover
                await doc.save()
                result.append(doc)
            else:
                await book.insert()
                result.append(book)
        return result

    async def save_user_books_bulk(
        self, user_books: list[UserBook]
    ) -> list[UserBook]:
        """批量保存用户书籍，按 (user_id, bookId) 去重"""
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
            if (ub.user_id, ub.bookId) in existing_map:
                doc = existing_map[(ub.user_id, ub.bookId)]
                doc.readUpdateTime = ub.readUpdateTime
                doc.finishReading = ub.finishReading
                doc.secret = ub.secret
                await doc.save()
                updated.append(doc)
            else:
                new_books.append(ub)

        if new_books:
            await UserBook.insert_many(new_books)
        return updated + new_books

    async def save_user_archives_bulk(
        self, archives: list[Archive]
    ) -> list[Archive]:
        """批量保存用户书单，按 (user_id, name) 去重"""
        if not archives:
            return []

        conditions = [{"user_id": a.user_id, "name": a.name} for a in archives]
        existing = await Archive.find({"$or": conditions}).to_list()
        existing_map = {(a.user_id, a.name): a for a in existing}

        new_archives = []
        updated = []
        for archive in archives:
            if (archive.user_id, archive.name) in existing_map:
                doc = existing_map[(archive.user_id, archive.name)]
                doc.bookIds = archive.bookIds
                await doc.save()
                updated.append(doc)
            else:
                new_archives.append(archive)

        if new_archives:
            await Archive.insert_many(new_archives)
        return updated + new_archives

    async def save_user_info(self, user_id, api_key) -> User:
        """保存用户信息"""
        existing_user = await User.find_one(User.user_id == user_id)
        if existing_user:
            existing_user.api_key = api_key
            await existing_user.save()
            return existing_user
        user = User(user_id=user_id, api_key=api_key)
        await user.insert()
        return user

    async def get_user_info(self, user_id) -> User | None:
        """获取用户信息"""
        user = await User.find_one(User.user_id == user_id)
        return user

    async def get_user_token(self, user_id) -> str | None:
        """获取用户API Key"""
        user = await self.get_user_info(user_id)
        return user.api_key if user else None

    async def save_book_info(self, book_info) -> WereadBook:
        """保存书籍信息"""
        book = WereadBook(**book_info)
        existing_book = await WereadBook.find_one(
            WereadBook.bookId == book.bookId
        )
        if existing_book:
            book.id = existing_book.id  # 保持原有ID
            await book.save()
            return book
        await book.insert()
        return book

    async def get_book_info(self, book_id) -> WereadBook | None:
        """获取书籍信息"""
        book = await WereadBook.find_one(WereadBook.bookId == book_id)
        return book

    async def save_user_book(self, user_book_info) -> UserBook:
        """保存用户书籍信息"""
        user_book = UserBook(**user_book_info)
        existing_user_book = await UserBook.find_one(
            (UserBook.user_id == user_book.user_id)
            & (UserBook.bookId == user_book.bookId)
        )
        if existing_user_book:
            user_book.id = existing_user_book.id  # 保持原有ID
            await user_book.save()
            return user_book
        await user_book.insert()
        return user_book

    async def save_user_archive(self, archive_info) -> Archive:
        """保存用户书单信息"""
        archive = Archive(**archive_info)
        existing_archive = await Archive.find_one(
            (Archive.user_id == archive.user_id)
            & (Archive.name == archive.name)
        )
        if existing_archive:
            archive.id = existing_archive.id  # 保持原有ID
            await archive.save()
            return archive
        await archive.insert()
        return archive

    async def get_user_shelf(
        self, user_id
    ) -> tuple[list[UserBook], list[Archive]]:
        """获取用户书架信息"""
        user_books = await UserBook.find(UserBook.user_id == user_id).to_list()
        user_archives = await Archive.find(
            Archive.user_id == user_id
        ).to_list()
        logger.info(
            f"获取用户 {user_id} 书架信息：{len(user_books)} 本书，{len(user_archives)} 个书单"
        )
        return user_books, user_archives
