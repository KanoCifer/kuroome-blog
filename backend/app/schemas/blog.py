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
    cover: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_pinned: int = 0


class BlogPostUpdate(BaseModel):
    """Blog post update input schema."""

    id: str = Field(alias="_id")  # MongoDB _id field
    title: str
    body: str
    summary: str | None = None
    cover: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_pinned: int = 0


class BlogPostDelete(BaseModel):
    """Blog post deletion input schema."""

    id: str = Field(alias="_id")  # MongoDB _id field


class BlogPostGet(BaseModel):
    """Blog post query by ID."""

    post_id: str = Field(alias="_id")  # MongoDB _id field


class TagItem(BaseModel):
    """A single tag with its post count."""

    name: str
    count: int


class TagsOut(BaseModel):
    """Tags list output — one entry per distinct tag."""

    tags: list[TagItem]


class PostsByTagOut(BaseModel):
    """Posts filtered by a single tag."""

    posts: list[dict]
    tag: str
    total: int
