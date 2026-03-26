"""Message board schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
