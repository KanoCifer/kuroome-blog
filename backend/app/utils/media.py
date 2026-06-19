"""Media upload helpers."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import pillow_heif
from fastapi import UploadFile, status

from app.core.exceptions import APIError

# 注册 HEIF 解码器,使 PIL.Image 能打开 .heic/.heif 文件
# (供 EXIF 读取、压缩等后续处理使用;上传存盘本身不经 PIL)
pillow_heif.register_heif_opener()

ALLOWED_IMAGE_TYPES: set[str] = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heif",
    "image/heic",
}

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB

# HEIF content_type -> 扩展名映射(浏览器/客户端常把 .heic 报成 image/heif)
_HEIF_EXT_BY_TYPE = {
    "image/heif": ".heif",
    "image/heic": ".heic",
}


def _get_media_root() -> Path:
    env_media = os.environ.get("MEDIA_PATH")
    if env_media:
        return Path(env_media)
    return Path(__file__).resolve().parent.parent.parent / "media"


def _guess_extension(upload_file: UploadFile) -> str:
    ext = Path(upload_file.filename or "").suffix.lower()
    if ext:
        return ext
    content_type = (upload_file.content_type or "").lower()
    if content_type == "image/jpeg":
        return ".jpg"
    if content_type == "image/png":
        return ".png"
    if content_type == "image/gif":
        return ".gif"
    if content_type == "image/webp":
        return ".webp"
    if content_type in _HEIF_EXT_BY_TYPE:
        return _HEIF_EXT_BY_TYPE[content_type]
    return ".bin"


def save_upload_image(upload_file: UploadFile, subdir: str) -> str:
    """Save uploaded image to media directory.

    Args:
        upload_file: The uploaded file object.
        subdir: Subdirectory under media root.

    Returns:
        The relative path under media root.
    """
    content_type = (upload_file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise APIError(
            code=status.HTTP_400_BAD_REQUEST,
            message="Unsupported image type.",
        )

    if upload_file.size and upload_file.size > MAX_IMAGE_BYTES:
        raise APIError(
            code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            message="Image is too large.",
        )

    content = upload_file.file.read()
    filename = f"{uuid.uuid4().hex}{_guess_extension(upload_file)}"
    media_root = _get_media_root()
    target_dir = media_root / subdir
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        raise APIError(
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to create media directory",
        ) from exc

    file_path: Path = target_dir / filename
    try:
        with file_path.open("wb") as f:
            f.write(content)
    except Exception as exc:
        raise APIError(
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to save image",
        ) from exc

    return f"{subdir}/{filename}"


def get_image_path(url: str) -> Path:
    """Get the full path of an image given its relative path under media root."""
    import re

    media_root: Path = _get_media_root()
    pattern = re.compile(r"^https?://.*?/media/")
    # 替换https://api.kanocifer.chat/api/v1/media/xxx
    relative_path = re.sub(pattern, "", url)

    return media_root / relative_path
