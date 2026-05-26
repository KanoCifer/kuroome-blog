from datetime import datetime

from beanie import PydanticObjectId
from pydantic import BaseModel


class FriendLinkCreate(BaseModel):
    name: str
    url: str
    favicon: str | None = None
    description: str | None = None
    email: str | None = None


class FriendLinkUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    favicon: str | None = None
    description: str | None = None
    email: str | None = None


class FriendLinkOut(BaseModel):
    id: str | PydanticObjectId
    name: str
    url: str
    sort_order: int = 0
    favicon: str | None = None
    description: str | None = None
    email: str | None = None
    created_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class FriendLinkReorder(BaseModel):
    ordered_ids: list[str]
