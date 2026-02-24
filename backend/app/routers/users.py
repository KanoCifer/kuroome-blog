"""User router for FastAPI.

This module provides user endpoints migrated from
backend/watchlist/api/views.py to FastAPI.

Endpoints:
    - PUT /api/user/settings - Update user settings
    - PUT /api/user/upload-pic - Upload avatar image
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import manager
from app.dependencies.database import get_session
from app.models.models import Profile, User
from app.schemas.response import APIResponse
from app.schemas.schemas import UserSettingsIn, UserSettingsOut

router = APIRouter(
    prefix="/user",
    tags=["users"],
    responses={401: {"description": "Unauthorized"}},
)


def _ensure_profile(user: User, db: AsyncSession) -> Profile:
    """Ensure user has a profile, creating one if needed.

    Args:
        user: The user to ensure has a profile
        db: Database session

    Returns:
        The user's profile (existing or newly created)
    """

    if not user.profile:
        profile = Profile(user_id=user.id)
        db.add(profile)
        return profile
    return user.profile


async def _check_username_exists(
    username: str,
    exclude_user_id: int,
    db: AsyncSession,
) -> bool:
    """Check if a username already exists for a different user.

    Args:
        username: The username to check
        exclude_user_id: User ID to exclude from check (current user)
        db: Database session

    Returns:
        True if username exists for another user, False otherwise
    """

    result = await db.execute(
        select(User).where(
            User.username == username,
            User.id != exclude_user_id,
        )
    )
    return result.scalar_one_or_none() is not None


def _save_upload_file(upload_file: UploadFile, user_id: int) -> str:
    """Save uploaded avatar file to media directory.

    Args:
        upload_file: The uploaded file object
        user_id: The user ID for organizing files

    Returns:
        The filename of the saved file

    Raises:
        HTTPException: If file saving fails
    """
    # Generate unique filename
    file_ext = Path(upload_file.filename or "avatar.jpg").suffix
    filename = f"{uuid.uuid4().hex}{file_ext}"

    # Determine media directory from env or default to backend/app/media
    env_media = os.environ.get("MEDIA_PATH")
    if env_media:
        media_root = Path(env_media)
    else:
        # use the repository's app/media directory (relative to this file)
        media_root = Path(__file__).resolve().parent.parent / "media"

    # store per-user so files don't collide
    user_dir = media_root / str(user_id)
    try:
        user_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create media directory: {e!s}",
        ) from e

    file_path = user_dir / filename
    try:
        # ensure file pointer at start
        upload_file.file.seek(0)
        with file_path.open("wb") as f:
            f.write(upload_file.file.read())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save avatar: {e!s}",
        ) from e

    # return relative path under media (e.g. "<user_id>/<filename>")
    return f"{user_id}/{filename}"


@router.put("/settings", response_model=UserSettingsOut)
async def update_user_settings(
    data: Annotated[UserSettingsIn, Depends()],
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
):
    """Update current user's profile settings.

    Updates user info including name, username, email, mobile, gender,
    and optionally password.

    Args:
        data: User settings update data
        user: Current authenticated user
        db: Database session

    Returns:
        API response with updated user settings

    Raises:
        HTTPException: 404 if user not found, 400 if username exists
    """

    # Get fresh user instance from database
    result = await db.execute(
        select(type(user)).where(type(user).id == user.id)
    )
    db_user = result.scalar_one_or_none()

    if db_user is None:
        return APIResponse.error(
            message="User not found.",
            code=status.HTTP_404_NOT_FOUND,
        )

    # Check if username is being changed and if it already exists
    if data.username != db_user.username:
        username_exists = await _check_username_exists(
            data.username, db_user.id, db
        )
        if username_exists:
            return APIResponse.error(
                message="Username already exists.",
                code=status.HTTP_400_BAD_REQUEST,
            )

    # Update user fields
    db_user.name = data.name
    db_user.username = data.username

    # Update password if provided
    if data.password:
        db_user.raw_password = data.password

    # Get or create profile
    profile = await db.execute(
        select(Profile).where(Profile.user_id == db_user.id)
    )
    db_profile = profile.scalar_one_or_none()

    if db_profile is None:
        db_profile = Profile(user_id=db_user.id)
        db.add(db_profile)

    # Update profile fields
    db_profile.gender = data.gender
    db_profile.email = data.email
    db_profile.mobile = data.mobile

    await db.commit()

    # Refresh to get updated data
    await db.refresh(db_user)
    await db.refresh(db_profile)

    return APIResponse.ok(
        data={
            "id": db_user.id,
            "name": db_user.name,
            "username": db_user.username,
            "gender": db_profile.gender,
            "email": db_profile.email,
            "mobile": db_profile.mobile,
            "photo": db_profile.photo,
            "message": "Profile updated successfully.",
        },
        message="Profile updated successfully.",
        code=status.HTTP_200_OK,
    )


@router.put("/upload-pic")
async def upload_avatar(
    image: Annotated[UploadFile, File()],
    user: User = Depends(manager),
    db: AsyncSession = Depends(get_session),
):
    """Upload avatar image for current user.

    Saves the uploaded avatar file and updates the user's profile photo.

    Args:
        image: Avatar image file
        user: Current authenticated user
        db: Database session

    Returns:
        API response with updated user settings including photo

    Raises:
        HTTPException: 404 if user not found, 500 if save fails
    """
    # Get fresh user instance from database
    result = await db.execute(
        select(type(user)).where(type(user).id == user.id)
    )
    db_user = result.scalar_one_or_none()

    if db_user is None:
        return APIResponse.error(
            message="User not found.",
            code=status.HTTP_404_NOT_FOUND,
        )

    # Get or create profile
    profile = await db.execute(
        select(Profile).where(Profile.user_id == db_user.id)
    )
    db_profile = profile.scalar_one_or_none()

    if db_profile is None:
        db_profile = Profile(user_id=db_user.id)
        db.add(db_profile)

    # Handle image upload
    if image and image.filename:
        image_filename = _save_upload_file(image, db_user.id)
        db_profile.photo = image_filename

    await db.commit()

    # Refresh to get updated data
    await db.refresh(db_user)
    await db.refresh(db_profile)

    return APIResponse.ok(
        data={
            "id": db_user.id,
            "name": db_user.name,
            "username": db_user.username,
            "gender": db_profile.gender,
            "email": db_profile.email,
            "mobile": db_profile.mobile,
            "photo": db_profile.photo,
            "message": "Avatar uploaded successfully.",
        },
        message="Avatar uploaded successfully.",
        code=status.HTTP_200_OK,
    )
