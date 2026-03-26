"""Book schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.pagination import PaginationSchema


class BookQuery(BaseModel):
    """Query parameters for fetching books."""

    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="add_date")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")


class BookOut(BaseModel):
    """Book output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    bookid: str
    cover: str
    iscompleted: bool
    add_date: datetime
    update_date: datetime


class BooksOut(BaseModel):
    """Books list output with pagination."""

    books: list[BookOut]
    pagination: PaginationSchema


class BookStatusIn(BaseModel):
    """Input schema for updating book status."""

    iscompleted: bool


class AddBookIn(BaseModel):
    """Input schema for adding a new book."""

    title: str
    author: str
    iscompleted: bool = False


class UpdateBookIn(BaseModel):
    """Input schema for updating a book."""

    title: str
    author: str
    iscompleted: bool = False
