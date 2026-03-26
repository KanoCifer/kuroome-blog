from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Book, UserBook


class BookRepository:
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
