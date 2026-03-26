"""Todo schemas."""

from __future__ import annotations

from pydantic import BaseModel


class TodoIn(BaseModel):
    """Todo creation schema."""

    text: str
    description: str | None = None
    dueDate: str | None = None  # ISO date string  # noqa: N815
    priority: str = "medium"  # low, medium, high
    category: str | None = None
    completed: bool = False
    id: str | None = None  # optional client-supplied id
    archived: bool = False
    archivedAt: str | None = None  # noqa: N815


class TodoUpdate(BaseModel):
    """Todo update schema."""

    text: str | None = None
    description: str | None = None
    dueDate: str | None = None  # noqa: N815
    priority: str | None = None
    category: str | None = None
    completed: bool | None = None
    archived: bool | None = None
    archivedAt: str | None = None  # noqa: N815


class TodoOut(BaseModel):
    """Todo output schema."""

    id: str
    text: str
    completed: bool
    createdAt: str  # noqa: N815
    description: str | None = None
    dueDate: str | None = None  # noqa: N815
    priority: str = "medium"
    category: str | None = None
    archived: bool = False
    archivedAt: str | None = None  # noqa: N815
