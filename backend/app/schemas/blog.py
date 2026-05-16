"""Blog schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BlogIn(BaseModel):
    """Blog query input schema."""

    page: int = 1


class BlogPostIn(BaseModel):
    """Blog post creation input schema."""

    title: str
    body: str
    summary: str | None = None
    category_id: int
    is_pinned: int = 0


class BlogPostUpdate(BaseModel):
    """Blog post update input schema."""

    id: str = Field(alias="_id")  # MongoDB _id field
    title: str
    body: str
    summary: str | None = None
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
