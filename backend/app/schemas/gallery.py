from pydantic import BaseModel, Field


class GalleryImage(BaseModel):
    """照片墙中的单张图片信息"""

    id: str
    uploadedAt: str | None = Field(
        default=None, description="图片上传时间，ISO格式字符串"
    )
    url: str
    description: str


class GalleryInput(BaseModel):
    """照片墙输入体"""

    images: list[GalleryImage] = Field(
        default_factory=list, description="图片列表"
    )


class GalleryResponse(BaseModel):
    """照片墙响应体"""

    images: list[GalleryImage] = Field(
        default_factory=list, description="图片列表"
    )
