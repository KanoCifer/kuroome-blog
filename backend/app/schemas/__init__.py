"""Pydantic schemas for API validation and serialization.

This package contains Pydantic models that mirror the existing APIFlask Schema
definitions. These are used for request/response validation in the new
FastAPI-compatible architecture.
"""

from __future__ import annotations

# Pagination schemas
# Book schemas
# Authentication schemas
# Blog schemas
# Comment schemas
# Message board schemas
# User settings schemas
# User profile schemas
# Image upload schemas
# Blog category schemas
# Admin comment schemas
from app.schemas.schemas import (
    AddBookIn,
    AdminCommentOut,
    AdminCommentsOut,
    AdminMessageOut,
    AdminMessagesOut,
    BlogIn,
    BlogPostDelete,
    BlogPostGet,
    BlogPostIn,
    BlogPostUpdate,
    BookOut,
    BookQuery,
    BooksOut,
    BookStatusIn,
    CategoriesOut,
    CategoryIn,
    CategoryOut,
    CommentOut,
    CommentsOut,
    EmailCodeIn,
    GetComment,
    ImageUploadOut,
    LoginIn,
    LoginOut,
    MessageIn,
    MessageOut,
    MessagesOut,
    PaginationSchema,
    PostComment,
    RegisterIn,
    RegisterOut,
    UserOut,
    UserProfileOut,
    UserSettingsIn,
    UserSettingsOut,
)

__all__ = [
    # Pagination
    "PaginationSchema",
    # Books
    "BookQuery",
    "BookOut",
    "BooksOut",
    "BookStatusIn",
    "AddBookIn",
    # Auth
    "LoginIn",
    "LoginOut",
    "RegisterIn",
    "RegisterOut",
    "EmailCodeIn",
    # Blog
    "BlogIn",
    "BlogPostIn",
    "BlogPostUpdate",
    "BlogPostDelete",
    "BlogPostGet",
    "CategoryIn",
    # Comments
    "GetComment",
    "PostComment",
    "CommentOut",
    "CommentsOut",
    # Messages
    "MessageIn",
    "MessageOut",
    "MessagesOut",
    "AdminMessageOut",
    "AdminMessagesOut",
    # User settings
    "UserSettingsIn",
    "UserSettingsOut",
    # User profile
    "UserOut",
    "UserProfileOut",
    # Image upload
    "ImageUploadOut",
    # Categories
    "CategoryOut",
    "CategoriesOut",
    # Admin comments
    "AdminCommentOut",
    "AdminCommentsOut",
]
