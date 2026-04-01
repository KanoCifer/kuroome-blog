"""Todo schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TodoCreate(BaseModel):
    """Todo creation request body."""

    text: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    dueDate: str | None = None  # noqa: N815
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    category: str | None = None


class TodoUpdate(BaseModel):
    """Partial update fields — only provided fields are applied."""

    text: str | None = None
    description: str | None = None
    dueDate: str | None = None  # noqa: N815
    priority: str | None = None
    category: str | None = None
    completed: bool | None = None
    archived: bool | None = None


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


class BatchAction(BaseModel):
    """Batch operation request."""

    action: str = Field(..., pattern="^(archiveCompleted|clearCompleted)$")
