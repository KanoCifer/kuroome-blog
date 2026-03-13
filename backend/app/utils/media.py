"""Media upload helpers."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB


def _get_media_root() -> Path:
    env_media = os.environ.get("MEDIA_PATH")
    if env_media:
        return Path(env_media)
    return Path(__file__).resolve().parent.parent / "media"


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type.",
        )

    upload_file.file.seek(0)
    content = upload_file.file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image is too large.",
        )

    filename = f"{uuid.uuid4().hex}{_guess_extension(upload_file)}"
    media_root = _get_media_root()
    target_dir = media_root / subdir
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create media directory: {exc!s}",
        ) from exc

    file_path = target_dir / filename
    try:
        with file_path.open("wb") as f:
            f.write(content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save image: {exc!s}",
        ) from exc

    return f"{subdir}/{filename}"
