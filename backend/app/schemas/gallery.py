from pydantic import BaseModel, Field


class GalleryImage(BaseModel):
    """图片画廊中的单张图片信息"""

    id: str
    uploadedAt: str | None = Field(
        default=None, description="图片上传时间，ISO格式字符串"
    )
    url: str
    description: str


class GalleryInput(BaseModel):
    """图片画廊输入体"""

    images: list[GalleryImage] = Field(
        default_factory=list, description="图片列表"
    )


class GalleryResponse(BaseModel):
    """图片画廊响应体"""

    images: list[GalleryImage] = Field(
        default_factory=list, description="图片列表"
    )
