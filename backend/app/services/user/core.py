from __future__ import annotations

import random
from datetime import timedelta

from fastapi import Request
from redis.asyncio import Redis as AsyncRedis

from app.api.des.auth import manager
from app.models.models import Profile, User
from app.repositories.user import UserRepo
from app.schemas.schemas import UserSettingsIn
from app.schemas.user import UserInfo, UserProfileOut
from app.utils.compress_image import compress_avartar
from app.utils.media import _get_media_root, save_upload_image


class UserService:
    """User business logic layer.

    Handles authentication, registration, and profile management.
    Passkey operations are in PasskeyService.
    GitHub OAuth is in GitHubAuthService.
    """

    def __init__(self, repo: UserRepo):
        self.repo = repo

    # ------------------------------------------------------------------ #
    # Authentication
    # ------------------------------------------------------------------ #

    async def authenticate_user(
        self, username: str, password: str
    ) -> User | None:
        """Validate username and password, return User if valid."""
        user = await self.repo.get_by_username_with_relations(username)
        if user is None or not user.validate_password(password):
            return None
        return user

    async def record_login(self, user: User, request: Request) -> None:
        """Update last login timestamp and IP address."""
        await self.repo.update_login_info(user, request)

    def create_tokens(
        self, user: User, *, remember_me: bool = False
    ) -> dict[str, str]:
        """Generate access and refresh tokens.

        When remember_me=True, tokens last 7/30 days.
        Otherwise, 12 hours / 7 days.
        """
        if remember_me:
            access_token = manager.create_access_token(
                data={"sub": str(user.id)}, expires=timedelta(days=7)
            )
            refresh_token = manager.create_access_token(
                data={"sub": str(user.id)}, expires=timedelta(days=30)
            )
        else:
            access_token = manager.create_access_token(
                data={"sub": str(user.id)}, expires=timedelta(hours=12)
            )
            refresh_token = manager.create_access_token(
                data={"sub": str(user.id)}, expires=timedelta(days=7)
            )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    async def logout(self, user: User) -> None:
        """Mark user offline."""
        await self.repo.set_active_by_id(user.id, False)

    # ------------------------------------------------------------------ #
    # User info
    # ------------------------------------------------------------------ #

    async def get_user_with_profile(
        self, user_id: int
    ) -> tuple[User, Profile | None] | None:
        """Fetch user with profile, creating profile if missing."""
        user = await self.repo.get_by_id(
            user_id, with_profile=True, with_passkey=True
        )
        if not user:
            return None
        if not user.profile:
            await self.repo.ensure_profile(user)
        return user, user.profile

    def user_to_dict(self, user: User, profile: Profile | None = None) -> dict:
        """Serialize user + profile to dict for API responses."""
        user_info = UserInfo(
            id=user.id,
            username=user.username,
            is_admin=user.is_admin,
            name=user.name,
            gender=profile.gender if profile else None,
            email=profile.email if profile else None,
            mobile=profile.mobile if profile else None,
            photo=profile.photo if profile else None,
            has_passkey=bool(user.passkey_credential),
            github_bound=bool(user.github_id),
        )
        return user_info.model_dump()

    # ------------------------------------------------------------------ #
    # Registration
    # ------------------------------------------------------------------ #

    async def register_user(
        self,
        username: str,
        password: str,
        email: str,
        email_code: str,
        redis: AsyncRedis,
    ) -> User | None:
        """Register new user after validating email code.

        Returns None if username taken, email taken, or code invalid.
        """
        if await self.repo.get_by_username(username):
            return None

        if await self.repo.is_email_taken(email):
            return None

        code_key = f"signup_code:{email}"
        stored_code = await redis.get(code_key)
        if stored_code is None or stored_code != email_code:
            return None

        user = await self.repo.create_user(
            username=username, password=password
        )
        await self.repo.create_profile(user_id=user.id, email=email)
        return user

    async def send_verification_code(
        self, email: str, redis: AsyncRedis
    ) -> str | None:
        """Generate 6-digit code and store in Redis with 10min TTL."""

        code = "".join(random.choices("0123456789", k=6))
        try:
            await redis.set(f"signup_code:{email}", code, ex=600)
        except Exception:
            return None
        return code

    # ------------------------------------------------------------------ #
    # Profile management
    # ------------------------------------------------------------------ #

    async def update_settings(self, user: User, data: UserSettingsIn) -> dict:
        """Update user profile fields, raising ValueError on duplicate username."""
        if data.username != user.username:
            if await self.repo.is_username_taken(
                data.username, exclude_user_id=user.id
            ):
                raise ValueError("Username already exists")
            await self.repo.set_username_by_id(user.id, data.username)

        await self.repo.set_name_by_id(user.id, data.name)

        if data.password:
            await self.repo.set_password_by_id(user.id, data.password)

        profile = await self.repo.get_profile(user.id)
        if not profile:
            profile = await self.repo.create_profile(user.id)

        await self.repo.update_profile(
            profile,
            email=data.email,
            gender=data.gender,
            mobile=data.mobile,
        )

        # Re-fetch to get actual DB values (user may be detached)
        updated_user = await self.repo.get_by_id(user.id, with_profile=True)
        assert updated_user is not None
        return UserProfileOut(
            id=updated_user.id,
            name=updated_user.name,
            username=updated_user.username,
            gender=updated_user.profile.gender
            if updated_user.profile
            else None,
            email=updated_user.profile.email if updated_user.profile else None,
            mobile=updated_user.profile.mobile
            if updated_user.profile
            else None,
            photo=updated_user.profile.photo if updated_user.profile else None,
        ).model_dump()

    async def upload_avatar(self, user: User, image) -> dict:
        """Upload and compress avatar to 256px thumbnail."""
        profile = await self.repo.get_profile(user.id)
        if not profile:
            profile = await self.repo.create_profile(user.id)

        if image and image.filename:
            image_filename = save_upload_image(image, str(user.id))
            media_root = _get_media_root()
            original_path = media_root / image_filename
            thumbnail_filename = image_filename.replace(".", "-256.")
            thumbnail_path = media_root / thumbnail_filename
            compress_avartar(str(original_path), str(thumbnail_path))
            await self.repo.update_profile(profile, photo=thumbnail_filename)

        return {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "gender": profile.gender,
            "email": profile.email,
            "mobile": profile.mobile,
            "photo": profile.photo,
            "message": "Avatar uploaded successfully.",
        }

    # ------------------------------------------------------------------ #
    # Token management
    # ------------------------------------------------------------------ #

    def build_login_data(self, user: User, refresh_token: str) -> dict:
        """Assemble the login response data dict (user info + refresh token)."""
        data = self.user_to_dict(user, user.profile)
        data["refresh_token"] = refresh_token
        return data

    async def refresh_user_token(
        self, token: str
    ) -> tuple[User, dict[str, str]] | None:
        """Validate a refresh token and issue a new token pair.

        Returns (user, tokens_dict) on success, None if the token is invalid
        or expired. Follows the same None-on-failure convention as
        authenticate_user().
        """
        try:
            user = await manager.get_current_user(token)
        except Exception:
            return None
        if user is None:
            return None
        tokens = self.create_tokens(user)
        return user, tokens
