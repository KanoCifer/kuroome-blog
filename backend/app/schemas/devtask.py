from datetime import datetime

from beanie import PydanticObjectId
from pydantic import BaseModel, Field


class DevTaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    priority: str = Field(default="default", pattern="^(low|high|default)$")
    status: str = Field(default="todo", pattern="^(todo|in-progress|done)$")
    due_date: datetime | None = None


class DevTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = Field(None, pattern="^(low|high|default)$")
    status: str | None = Field(None, pattern="^(todo|in-progress|done)$")
    due_date: datetime | None = None


class DevTaskOut(BaseModel):
    id: str | PydanticObjectId
    user_id: int
    title: str
    description: str | None = None
    priority: str
    status: str
    due_date: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
