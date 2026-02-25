from __future__ import annotations

from datetime import UTC, datetime
from typing import ClassVar

from beanie import Document, Indexed, PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field
from pymongo import ASCENDING, DESCENDING, IndexModel


class Comment(BaseModel):
    """Comment embedded in Post document."""

    id: PydanticObjectId = Field(default_factory=PydanticObjectId, alias="_id")
    author: str = "Anonymous"
    body: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    reviewed: bool = False
    replied_id: PydanticObjectId | None = None
    reply_to_author: str | None = None
    email: str | None = ""
    site: str | None = ""
    from_admin: bool = False

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class Post(Document):
    """Blog post document model."""

    title: str
    body: str
    category_id: int | None = None
    is_pinned: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    comments: list[Comment] = Field(default_factory=list)

    class Settings:
        name = "posts"
        indexes: ClassVar[list] = [
            IndexModel(
                [("is_pinned", DESCENDING), ("created_at", DESCENDING)]
            ),
            IndexModel([("category_id", ASCENDING)]),
        ]
        # 关键配置：告诉 Pydantic 如何序列化 ObjectId
        bson_encoders: ClassVar[dict] = {PydanticObjectId: str}

        # 如果你使用的是 Pydantic v2，还需要加上这个配置
        model_config = ConfigDict(arbitrary_types_allowed=True)


class MessageBoard(Document):
    """Message board document model."""

    name: Indexed(str)  # type: ignore
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    review: int = 0  # 0: pending, 1: approved
    from_admin: bool = False

    class Settings:
        name = "message_board"
        indexes: ClassVar[list] = [
            IndexModel([("review", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
        ]
