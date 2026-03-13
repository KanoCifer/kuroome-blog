"""User router for FastAPI.

This module provides user endpoints migrated from
backend/watchlist/api/views.py to FastAPI.

Endpoints:
    - PUT /api/user/settings - Update user settings
    - PUT /api/user/upload-pic - Upload avatar image
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import manager
from app.dependencies.database import get_session
from app.models.models import Profile, User
from app.schemas.response import APIResponse
from app.schemas.schemas import UserSettingsIn
from app.utils.compress_image import compress_avartar
from app.utils.media import _get_media_root, save_upload_image

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


@router.put("/settings")
async def update_user_settings(
    data: UserSettingsIn,
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
        image_filename = save_upload_image(image, str(db_user.id))
        media_root = _get_media_root()
        original_path = media_root / image_filename
        thumbnail_filename = image_filename.replace(".", "-256.")
        thumbnail_path = media_root / thumbnail_filename
        compress_avartar(str(original_path), str(thumbnail_path))
        db_profile.photo = thumbnail_filename

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
