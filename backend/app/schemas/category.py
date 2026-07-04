"""Category schemas — kept for backward compatibility; no longer used by the
blog tag migration. Safe to remove in a follow-up cleanup."""

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
