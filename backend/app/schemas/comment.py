"""Comment schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


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
