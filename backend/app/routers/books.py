"""Books router for FastAPI.

This module provides book CRUD endpoints migrated from
backend/watchlist/api/views.py to FastAPI.

Endpoints:
    - GET /api/book - Get user's books (paginated)
    - POST /api/books/addbook - Add a new book
    - DELETE /api/books/{book_id} - Delete a book
    - PATCH /api/books/{book_id}/status - Update book status
    - PUT /api/books/{book_id} - Update book details
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import manager
from app.dependencies.database import get_session
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import (
    AddBookIn,
    BookStatusIn,
    UpdateBookIn,
)

router = APIRouter(
    tags=["books"],
)


@router.get(
    "/book",
)
async def get_books(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="add_date"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
):
    """Get user's books with pagination.

    This endpoint returns a paginated list of books in the user's collection
    with optional sorting. Results are cached for 60 seconds.

    Args:
        request: FastAPI request object
        page: Page number (default: 1)
        per_page: Items per page (default: 20, max: 100)
        sort_by: Field to sort by (add_date, update_date, iscompleted)
        sort_order: Sort direction (asc, desc)
        user: Current authenticated user
        db: Database session
        cache: Cache service for response caching

    Returns:
        Tuple of (response dict, HTTP status code)

    Cache Key Format:
        books:{user_id}:{full_path}
    """
    from app.models.models import UserBook

    # Build sort column
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

    # Get total count
    count_result = await db.execute(
        select(UserBook).where(UserBook.user_id == user.id)
    )
    total = len(count_result.scalars().all())

    # Calculate pagination
    offset = (page - 1) * per_page
    total_pages = (total + per_page - 1) // per_page if total > 0 else 1

    # Fetch books with pagination
    result = await db.execute(
        select(UserBook)
        .where(UserBook.user_id == user.id)
        .order_by(order_clause)
        .offset(offset)
        .limit(per_page)
    )
    user_books = result.scalars().all()

    # Build book list
    books = []
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

    # Build pagination metadata
    pagination = {
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": total_pages,
        "has_prev": page > 1,
        "has_next": page < total_pages,
        "prev_num": page - 1 if page > 1 else None,
        "next_num": page + 1 if page < total_pages else None,
    }

    response_data = {
        "books": books,
        "pagination": pagination,
    }

    # Cache the result for 60 seconds

    # Add cache control headers
    return APIResponse.ok(
        data=response_data,
        message="Books retrieved successfully",
    )


@router.post(
    "/books/addbook",
)
async def add_book(
    data: AddBookIn,
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
):
    """Add a new book to user's collection.

    This endpoint creates a new book entry if it doesn't exist and adds it
    to the user's collection. If the book already exists in the database,
    it will be linked to the user's collection instead of creating a duplicate.

    Args:
        data: Book data with title, author, and optional completion status
        user: Current authenticated user
        db: Database session
        cache: Cache service for cache invalidation

    Returns:
        Tuple of (response dict, HTTP status code)

    Raises:
        HTTPException: 400 if book already exists in user's collection
    """
    from app.models.models import Book, UserBook

    title = data.title
    author = data.author
    iscompleted = data.iscompleted

    # Check if book already exists in database
    result = await db.execute(
        select(Book).where(Book.title == title, Book.author == author)
    )
    book = result.scalar_one_or_none()

    if not book:
        # Create new book entry
        book = Book(title=title, author=author)
        db.add(book)
        await db.flush()  # Get book.id without committing

    # Check if user already has this book
    result = await db.execute(
        select(UserBook).where(
            UserBook.user_id == user.id,
            UserBook.book_id == book.id,
        )
    )
    existing_user_book = result.scalar_one_or_none()

    if existing_user_book:
        return APIResponse.error(
            message="Book already exists in your collection",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # Create user-book association
    user_book = UserBook(
        user_id=user.id,
        book_id=book.id,
        iscompleted=iscompleted,
    )
    db.add(user_book)
    await db.commit()

    # Invalidate cache

    return APIResponse.ok(
        message="Book added to your collection successfully",
        code=status.HTTP_201_CREATED,
    )


@router.delete(
    "/books/{book_id}",
    responses={
        200: {"description": "Book deleted successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Book not found in user's collection"},
    },
)
async def delete_book(
    book_id: int,
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
):
    """Delete a book from user's collection.

    This endpoint removes a book from the user's collection. It only removes
    the association between the user and the book, not the book record itself.

    Args:
        book_id: ID of the book to delete from user's collection
        user: Current authenticated user
        db: Database session
        cache: Cache service for cache invalidation

    Returns:
        Tuple of (response dict, HTTP status code)

    Raises:
        HTTPException: 404 if book not found in user's collection
    """
    from app.models.models import UserBook

    # Find the user-book association
    result = await db.execute(
        select(UserBook).where(
            UserBook.user_id == user.id,
            UserBook.book_id == book_id,
        )
    )
    user_book = result.scalar_one_or_none()

    if not user_book:
        return APIResponse.error(
            message="Book not found in your collection",
            code=status.HTTP_404_NOT_FOUND,
        )

    # Delete the association
    await db.delete(user_book)
    await db.commit()

    # Invalidate cache

    return APIResponse.ok(
        message="Book deleted successfully",
        code=status.HTTP_200_OK,
    )


@router.patch(
    "/books/{book_id}/status",
    responses={
        200: {"description": "Book status updated successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Book not found in user's collection"},
    },
)
async def update_book_status(
    book_id: int,
    data: BookStatusIn,
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
):
    """Update completion status of a book in user's collection.

    This endpoint updates the iscompleted status of a book in the user's
    collection. This is typically used to mark books as read or unread.

    Args:
        book_id: ID of the book to update
        data: Status data with iscompleted boolean
        user: Current authenticated user
        db: Database session
        cache: Cache service for cache invalidation

    Returns:
        Tuple of (response dict, HTTP status code)

    Raises:
        HTTPException: 404 if book not found in user's collection
    """
    from app.models.models import UserBook

    # Find the user-book association
    result = await db.execute(
        select(UserBook).where(
            UserBook.user_id == user.id,
            UserBook.book_id == book_id,
        )
    )
    user_book = result.scalar_one_or_none()

    if not user_book:
        return APIResponse.error(
            message="Book not found in your collection",
            code=status.HTTP_404_NOT_FOUND,
        )

    # Update the status
    user_book.iscompleted = data.iscompleted
    await db.commit()

    # Invalidate cache

    return APIResponse.ok(
        data={"book_id": book_id, "iscompleted": user_book.iscompleted},
        message="Book status updated successfully",
    )


@router.put(
    "/books/{book_id}",
    responses={
        200: {"description": "Book updated successfully"},
        401: {"description": "Authentication required"},
        404: {"description": "Book not found in user's collection"},
    },
)
async def update_book(
    book_id: int,
    data: UpdateBookIn,
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
):
    """Update a book in user's collection.

    This endpoint updates the book details (title, author) and completion
    status of a book in the user's collection.

    Args:
        book_id: ID of the book to update
        data: Book data with title, author, and completion status
        user: Current authenticated user
        db: Database session
        cache: Cache service for cache invalidation

    Returns:
        Tuple of (response dict, HTTP status code)

    Raises:
        HTTPException: 404 if book not found in user's collection
    """
    from app.models.models import Book, UserBook

    # Find the user-book association
    result = await db.execute(
        select(UserBook).where(
            UserBook.user_id == user.id,
            UserBook.book_id == book_id,
        )
    )
    user_book = result.scalar_one_or_none()

    if not user_book:
        return APIResponse.error(
            message="Book not found in your collection",
            code=status.HTTP_404_NOT_FOUND,
        )

    # Update the book and user-book
    book = await db.get(Book, book_id)
    if book:
        book.title = data.title
        book.author = data.author

    # Update user-book status
    user_book.iscompleted = data.iscompleted
    await db.commit()

    # Invalidate cache

    return APIResponse.ok(
        message="Book updated successfully",
    )
