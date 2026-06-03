from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Book, UserBook


class BookRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def count_user_books(self, user_id: int) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(UserBook)
            .where(UserBook.user_id == user_id)
        )
        return int(result.scalar_one() or 0)

    async def list_user_books(
        self,
        user_id: int,
        *,
        order_clause,
        offset: int,
        limit: int,
    ) -> list[UserBook]:
        result = await self.session.execute(
            select(UserBook)
            .options(selectinload(UserBook.book))
            .where(UserBook.user_id == user_id)
            .order_by(order_clause)
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_book_by_title_author(
        self,
        title: str,
        author: str,
    ) -> Book | None:
        result = await self.session.execute(
            select(Book).where(Book.title == title, Book.author == author)
        )
        return result.scalar_one_or_none()

    async def create_book(self, *, title: str, author: str) -> Book:
        book = Book(title=title, author=author)
        self.session.add(book)
        await self.session.flush()
        return book

    async def get_user_book(
        self,
        *,
        user_id: int,
        book_id: int,
    ) -> UserBook | None:
        result = await self.session.execute(
            select(UserBook).where(
                UserBook.user_id == user_id,
                UserBook.book_id == book_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_user_book(
        self,
        *,
        user_id: int,
        book_id: int,
        iscompleted: bool,
    ) -> UserBook:
        user_book = UserBook(
            user_id=user_id,
            book_id=book_id,
            iscompleted=iscompleted,
        )
        self.session.add(user_book)
        return user_book

    async def delete_user_book(self, user_book: UserBook) -> None:
        await self.session.delete(user_book)

    async def get_book_by_id(self, book_id: int) -> Book | None:
        return await self.session.get(Book, book_id)

    async def get_book_by_bookid(self, bookid: str) -> Book | None:
        result = await self.session.execute(
            select(Book).where(Book.bookid == bookid)
        )
        return result.scalar_one_or_none()

    async def create_book_with_bookid(
        self, *, title: str, author: str, bookid: str, cover: str | None = None
    ) -> Book:
        book = Book(title=title, author=author, bookid=bookid, cover=cover)
        self.session.add(book)
        await self.session.flush()
        return book

    async def save_books_bulk(self, books: list[dict]) -> list[Book]:
        """批量保存书籍，按 bookid 去重，返回全部 Book 对象"""
        bookids = [b["bookId"] for b in books if b.get("bookId")]
        existing = await self.session.execute(
            select(Book).where(Book.bookid.in_(bookids))
        )
        existing_map = {b.bookid: b for b in existing.scalars().all()}

        result = []
        for item in books:
            bookid = item.get("bookId")
            if bookid in existing_map:
                result.append(existing_map[bookid])
            else:
                new_book = Book(
                    title=item["title"],
                    author=item["author"],
                    bookid=bookid,
                    cover=item.get("cover"),
                )
                self.session.add(new_book)
                await self.session.flush()
                result.append(new_book)
        return result

    async def save_user_books_bulk(
        self, user_id: int, books: list[dict], book_map: dict[str, Book]
    ) -> int:
        """批量保存用户书籍关联，返回新增数量"""
        book_ids = [book_map[b["bookId"]].id for b in books]
        existing = await self.session.execute(
            select(UserBook).where(
                UserBook.user_id == user_id,
                UserBook.book_id.in_(book_ids),
            )
        )
        existing_book_ids = {ub.book_id for ub in existing.scalars().all()}

        new_count = 0
        for item in books:
            book = book_map[item["bookId"]]
            if book.id not in existing_book_ids:
                iscompleted = bool(item.get("finishReading", False))
                self.session.add(
                    UserBook(
                        user_id=user_id,
                        book_id=book.id,
                        iscompleted=iscompleted,
                    )
                )
                new_count += 1
        return new_count
