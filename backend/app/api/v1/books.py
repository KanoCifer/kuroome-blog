from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.des.auth import manager
from app.api.des.des import book_service_dep
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import (
    AddBookIn,
    BookStatusIn,
    UpdateBookIn,
)
from app.services.book_service import BookDomainError, BookService

router = APIRouter(
    tags=["books"],
)


@router.get(
    "/books",
)
async def get_books(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="add_date"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    user: User = Depends(manager),
    book_service: BookService = Depends(book_service_dep),
):
    response_data = await book_service.get_books(
        user_id=user.id,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )
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
    book_service: BookService = Depends(book_service_dep),
):
    try:
        await book_service.add_book(
            user_id=user.id,
            title=data.title,
            author=data.author,
            iscompleted=data.iscompleted,
        )
    except BookDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

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
    book_service: BookService = Depends(book_service_dep),
):
    try:
        await book_service.delete_book(user_id=user.id, book_id=book_id)
    except BookDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

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
    book_service: BookService = Depends(book_service_dep),
):
    try:
        payload = await book_service.update_book_status(
            user_id=user.id,
            book_id=book_id,
            iscompleted=data.iscompleted,
        )
    except BookDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data=payload,
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
    book_service: BookService = Depends(book_service_dep),
):
    try:
        await book_service.update_book(
            user_id=user.id,
            book_id=book_id,
            title=data.title,
            author=data.author,
            iscompleted=data.iscompleted,
        )
    except BookDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        message="Book updated successfully",
    )
