from datetime import datetime
from typing import Any

from beanie import PydanticObjectId
from pydantic import BaseModel, Field

from app.models.moment import (
    MomentAttachmentType,
    MomentStatus,
    MomentVisibility,
)


class MomentAttachmentIn(BaseModel):
    type: MomentAttachmentType = MomentAttachmentType.IMAGE
    url: str = Field(..., min_length=1, max_length=1000)
    thumbnail_url: str | None = Field(None, max_length=1000)
    title: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=500)
    meta: dict[str, Any] | None = None


class MomentLocationIn(BaseModel):
    name: str | None = Field(None, max_length=100)
    latitude: float | None = None
    longitude: float | None = None


class MomentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    summary: str | None = Field(None, max_length=300)
    visibility: MomentVisibility = MomentVisibility.PUBLIC
    status: MomentStatus = MomentStatus.PUBLISHED
    mood: str | None = Field(None, max_length=50)
    tags: list[str] = Field(default_factory=list, max_length=20)
    attachments: list[MomentAttachmentIn] = Field(default_factory=list)
    location: MomentLocationIn | None = None
    source: str | None = Field(None, max_length=50)
    is_pinned: bool = False
    allow_comment: bool = True
    published_at: datetime | None = None


class MomentUpdate(BaseModel):
    content: str | None = Field(None, min_length=1, max_length=2000)
    summary: str | None = Field(None, max_length=300)
    visibility: MomentVisibility | None = None
    status: MomentStatus | None = None
    mood: str | None = Field(None, max_length=50)
    tags: list[str] | None = Field(None, max_length=20)
    attachments: list[MomentAttachmentIn] | None = None
    location: MomentLocationIn | None = None
    source: str | None = Field(None, max_length=50)
    is_pinned: bool | None = None
    allow_comment: bool | None = None
    published_at: datetime | None = None


class MomentAttachmentOut(MomentAttachmentIn):
    pass


class MomentLocationOut(MomentLocationIn):
    pass


class MomentOut(BaseModel):
    id: str | PydanticObjectId
    user_id: int
    content: str
    summary: str | None = None
    visibility: MomentVisibility
    status: MomentStatus
    mood: str | None = None
    tags: list[str]
    attachments: list[MomentAttachmentOut]
    location: MomentLocationOut | None = None
    source: str | None = None
    is_pinned: bool
    allow_comment: bool
    like_count: int
    comment_count: int
    view_count: int
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class MomentListOut(BaseModel):
    moments: list[MomentOut]
    total: int
    page: int
    page_size: int
