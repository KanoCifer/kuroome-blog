"""User schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class UserSettingsIn(BaseModel):
    """User settings update input schema."""

    name: str = Field(..., max_length=20)
    username: str = Field(..., max_length=20)
    gender: str | None = None
    email: str | None = None
    mobile: str | None = None
    password: str | None = None


class UserSettingsOut(BaseModel):
    """User settings output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    username: str
    gender: str | None
    email: str | None
    mobile: str | None
    photo: str | None
    message: str | None


class UserOut(BaseModel):
    """User output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_admin: bool


class UserProfileOut(BaseModel):
    """User profile output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    username: str
    gender: str | None
    email: str | None
    mobile: str | None
    photo: str | None
    about: str | None


class ImageUploadOut(BaseModel):
    """Image upload output schema."""

    filename: str


class UserInfo(BaseModel):
    """User info output schema."""

    id: int
    username: str
    is_admin: bool
    name: str
    email: str | None
    mobile: str | None
    gender: str | None
    photo: str | None
    has_passkey: bool
    github_bound: bool
