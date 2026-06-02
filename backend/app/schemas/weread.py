from typing import Any

from pydantic import BaseModel, Field


class ImportBooksIn(BaseModel):
    """Import books from WeRead input schema."""

    weread_cookie: str


class SaveUserInfoIn(BaseModel):
    """保存微信读书用户信息输入 schema."""

    api_key: str = Field(..., min_length=1, description="微信读书 API Key")


class WereadBookShelfJSONSchema(BaseModel):
    """JSON schema model for WeRead data."""

    mp: Mp
    albums: list[Album]
    archive: list[Archive]
    books: list[BookElement]


class AlbumInfo(BaseModel):
    """Album info model."""

    album_id: str
    name: str
    author_name: str
    cover: str
    update_time: int
    pay_type: int
    type: int
    track_count: int
    finish_status: str
    finish: int
    off: int
    intro: str
    free: int


class AlbumInfoExtra(BaseModel):
    """Album info extra model."""

    album_id: str
    secret: int
    lecture_paid: int
    lecture_read_update_time: int
    is_top: bool


class Album(BaseModel):
    """Album model."""

    album_info: AlbumInfo
    album_info_extra: AlbumInfoExtra


class Archive(BaseModel):
    """Archive model."""

    book_ids: list[str]
    name: str
    album_ids: list[Any]


class BookElement(BaseModel):
    """Book element model."""

    book_id: str
    title: str
    author: str
    cover: str
    update_time: int
    finish_reading: int
    read_update_time: int
    secret: int
    category: str | None = None


class MpBook(BaseModel):
    """Mp book model."""

    book_id: str
    title: str
    cover: str
    secret: int
    pay_type: int
    paid: int
    update_time: int
    read_update_time: int
    is_top: bool


class Mp(BaseModel):
    """Mp model."""

    show: int
    archive_id: int
    book: MpBook
