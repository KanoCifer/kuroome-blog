from __future__ import annotations

from app.models.models import UserBook
from app.repositories.book_repo import BookRepository


class BookDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class BookService:
    def __init__(self, repo: BookRepository) -> None:
        self.repo = repo

    async def get_books(
        self,
        *,
        user_id: int,
        page: int,
        per_page: int,
        sort_by: str,
        sort_order: str,
    ) -> dict:
        sort_map = {
            "add_date": UserBook.add_date,
            "update_date": UserBook.update_date,
            "iscompleted": UserBook.iscompleted,
        }
        sort_column = sort_map.get(sort_by, UserBook.add_date)
        order_clause = (
            sort_column.asc()
            if sort_order.lower() == "asc"
            else sort_column.desc()
        )

        total = await self.repo.count_user_books(user_id)
        offset = (page - 1) * per_page
        total_pages = (total + per_page - 1) // per_page if total > 0 else 1

        user_books = await self.repo.list_user_books(
            user_id,
            order_clause=order_clause,
            offset=offset,
            limit=per_page,
        )

        books: list[dict] = []
        for user_book in user_books:
            book = user_book.book
            books.append(
                {
                    "id": book.id,
                    "title": book.title,
                    "author": book.author,
                    "bookid": book.bookid,
                    "cover": book.cover,
                    "iscompleted": user_book.iscompleted,
                    "add_date": user_book.add_date,
                    "update_date": user_book.update_date,
                }
            )

        return {
            "books": books,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": total_pages,
                "has_prev": page > 1,
                "has_next": page < total_pages,
                "prev_num": page - 1 if page > 1 else None,
                "next_num": page + 1 if page < total_pages else None,
            },
        }

    async def add_book(
        self,
        *,
        user_id: int,
        title: str,
        author: str,
        iscompleted: bool,
    ) -> None:
        book = await self.repo.get_book_by_title_author(
            title=title, author=author
        )
        if not book:
            book = await self.repo.create_book(title=title, author=author)

        user_book = await self.repo.get_user_book(
            user_id=user_id,
            book_id=book.id,
        )
        if user_book:
            raise BookDomainError(
                "Book already exists in your collection",
                400,
            )

        await self.repo.create_user_book(
            user_id=user_id,
            book_id=book.id,
            iscompleted=iscompleted,
        )

    async def delete_book(self, *, user_id: int, book_id: int) -> None:
        user_book = await self.repo.get_user_book(
            user_id=user_id,
            book_id=book_id,
        )
        if not user_book:
            raise BookDomainError("Book not found in your collection", 404)
        await self.repo.delete_user_book(user_book)

    async def update_book_status(
        self,
        *,
        user_id: int,
        book_id: int,
        iscompleted: bool,
    ) -> dict[str, int | bool]:
        user_book = await self.repo.get_user_book(
            user_id=user_id,
            book_id=book_id,
        )
        if not user_book:
            raise BookDomainError("Book not found in your collection", 404)

        user_book.iscompleted = iscompleted
        return {"book_id": book_id, "iscompleted": user_book.iscompleted}

    async def update_book(
        self,
        *,
        user_id: int,
        book_id: int,
        title: str,
        author: str,
        iscompleted: bool,
    ) -> None:
        user_book = await self.repo.get_user_book(
            user_id=user_id,
            book_id=book_id,
        )
        if not user_book:
            raise BookDomainError("Book not found in your collection", 404)

        book = await self.repo.get_book_by_id(book_id)
        if book:
            book.title = title
            book.author = author

        user_book.iscompleted = iscompleted
