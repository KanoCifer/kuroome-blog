"""Pydantic schemas for API validation and serialization.

This module contains Pydantic models that mirror the existing APIFlask Schema
definitions. These are used for request/response validation in the new
FastAPI-compatible architecture.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# Pagination Schemas
# =============================================================================


class PaginationSchema(BaseModel):
    """Pagination metadata schema."""

    model_config = ConfigDict(from_attributes=True)

    page: int
    per_page: int
    total: int
    pages: int
    has_prev: bool
    has_next: bool
    prev_num: int | None
    next_num: int | None


# =============================================================================
# Book Schemas
# =============================================================================


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


# =============================================================================
# Authentication Schemas
# =============================================================================


class LoginIn(BaseModel):
    """Login input schema."""

    username: str
    password: str
    remember_me: bool = False


class LoginOut(BaseModel):
    """Login output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_admin: bool


class RegisterIn(BaseModel):
    """Registration input schema."""

    username: str
    password: str
    email: str
    email_code: str


class RegisterOut(BaseModel):
    """Registration output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_admin: bool


class EmailCodeIn(BaseModel):
    """Email verification code request schema."""

    email: str


# =============================================================================
# Blog Schemas
# =============================================================================


class BlogIn(BaseModel):
    """Blog query input schema."""

    page: int = 1


class BlogPostIn(BaseModel):
    """Blog post creation input schema."""

    title: str
    body: str
    category_id: int
    is_pinned: int = 0


class BlogPostUpdate(BaseModel):
    """Blog post update input schema."""

    id: str = Field(alias="_id")  # MongoDB _id field
    title: str
    body: str
    category_id: int
    is_pinned: int = 0


class BlogPostDelete(BaseModel):
    """Blog post deletion input schema."""

    id: str = Field(alias="_id")  # MongoDB _id field


class BlogPostGet(BaseModel):
    """Blog post query by ID."""

    post_id: str = Field(alias="_id")  # MongoDB _id field


class CategoryIn(BaseModel):
    """Category query input schema."""

    category_id: int


# =============================================================================
# Comment Schemas
# =============================================================================


class GetComment(BaseModel):
    """Get comments query schema."""

    post_id: str


class PostComment(BaseModel):
    """Post comment input schema."""

    post_id: str
    body: str = Field(..., min_length=1, max_length=1000)
    author: str = Field(..., min_length=1, max_length=50)
    reply_to: str | None = None
    reply_to_author: str | None = Field(None, max_length=50)


class CommentOut(BaseModel):
    """Comment output schema."""

    id: str = Field(alias="_id")
    author: str
    body: str
    created_at: datetime | None
    reply_to_author: str
    replied_id: str | None
    reviewed: bool
    comments: list[dict[str, Any]] = []  # Nested replies


class CommentsOut(BaseModel):
    """Comments list output."""

    comments: list[CommentOut]


# =============================================================================
# Message Board Schemas
# =============================================================================


class MessageIn(BaseModel):
    """Message board input schema."""

    name: str = Field(..., min_length=1, max_length=20)
    message: str = Field(..., min_length=1, max_length=500)


class MessageOut(BaseModel):
    """Message board output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    message: str
    created_at: datetime | None
    from_admin: bool


class MessagesOut(BaseModel):
    """Messages list output."""

    messages: list[MessageOut]


class AdminMessageOut(BaseModel):
    """Admin message output with review status."""

    id: str
    name: str
    message: str
    created_at: datetime | None
    review: int  # 0 = pending, 1 = approved


class AdminMessagesOut(BaseModel):
    """Admin messages list output."""

    pending: list[AdminMessageOut]
    approved: list[AdminMessageOut]


# =============================================================================
# User Settings Schemas
# =============================================================================


class UserSettingsIn(BaseModel):
    """User settings update input schema."""

    name: str = Field(..., max_length=20)
    username: str = Field(..., max_length=20)
    gender: str | None = None
    email: str | None = None
    mobile: str | None = None
    password: str | None = None


class UserSettingsOut(BaseModel):
    """User settings output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    username: str
    gender: str | None
    email: str | None
    mobile: str | None
    photo: str | None
    message: str | None


# =============================================================================
# User Profile Schemas
# =============================================================================


class UserOut(BaseModel):
    """User output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_admin: bool


class UserProfileOut(BaseModel):
    """User profile output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    username: str
    gender: str | None
    email: str | None
    mobile: str | None
    photo: str | None
    about: str | None


# =============================================================================
# Image Upload Schemas
# =============================================================================


class ImageUploadOut(BaseModel):
    """Image upload output schema."""

    filename: str


# =============================================================================
# Blog Category Schemas
# =============================================================================


class CategoryOut(BaseModel):
    """Category output schema."""

    id: int
    name: str
    post_count: int


class CategoriesOut(BaseModel):
    """Categories list output."""

    categories: list[CategoryOut]
    category_counts: dict[int, int]


# =============================================================================
# Admin Comment Schemas
# =============================================================================


class AdminCommentOut(BaseModel):
    """Admin comment output with post info."""

    id: str
    post_id: str
    post_title: str
    author: str
    email: str
    body: str
    site: str
    from_admin: bool
    reviewed: bool
    replied_id: str | None
    created_at: datetime | None


class AdminCommentsOut(BaseModel):
    """Admin comments list output."""

    pending: list[AdminCommentOut]
    approved: list[AdminCommentOut]
