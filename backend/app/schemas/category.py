"""Blog category schemas."""

from __future__ import annotations

from pydantic import BaseModel


class CategoryOut(BaseModel):
    """Category output schema."""

    id: int
    name: str
    post_count: int


class CategoriesOut(BaseModel):
    """Categories list output."""

    categories: list[CategoryOut]
    category_counts: dict[int, int]
