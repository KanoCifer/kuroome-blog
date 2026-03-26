"""Pagination schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


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
