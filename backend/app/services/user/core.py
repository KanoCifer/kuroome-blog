from __future__ import annotations

import random
from datetime import timedelta

from fastapi import Request
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.des.auth import create_access_token, resolve_user_from_token
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
        self, session: AsyncSession, username: str, password: str
    ) -> User | None:
        """Validate username and password, return User if valid.

        On success, if the user still uses an old werkzeug pbkdf2 hash,
        it is silently upgraded to bcrypt (same algorithm as the Go backend).
        """
        user = await self.repo.get_by_username_with_relations(
            session, username
        )
        if user is None or not user.validate_password(password):
            return None
        if user.needs_hash_upgrade():
            await self.repo.set_password(session, user, password)
        return user

    async def record_login(
        self, session: AsyncSession, user: User, request: Request
    ) -> None:
        """Update last login timestamp and IP address."""
        await self.repo.update_login_info(session, user, request)

    async def create_tokens(
        self, user: User, redis: AsyncRedis | None = None
    ) -> dict[str, str]:
        """Generate access (1h) and refresh (7d) tokens.

        When *redis* is provided, the refresh token is stored at
        ``refresh:{user_id}`` so that logout / rotation can invalidate it.
        Passing ``None`` degrades gracefully (stateless, same as before).
        """
        access_token = create_access_token(
            sub=str(user.id), expires=timedelta(hours=1)
        )
        refresh_token = create_access_token(
            sub=str(user.id), expires=timedelta(days=7)
        )
        if redis is not None:
            await redis.set(
                f"refresh:{user.id}", refresh_token, ex=7 * 24 * 3600
            )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    async def logout(
        self,
        session: AsyncSession,
        user: User,
        redis: AsyncRedis | None = None,
    ) -> None:
        """Mark user offline and invalidate the refresh token."""
        await self.repo.set_active_by_id(session, user.id, False)
        if redis is not None:
            await redis.delete(f"refresh:{user.id}")

    # ------------------------------------------------------------------ #
    # User info
    # ------------------------------------------------------------------ #

    async def get_user_with_profile(
        self, session: AsyncSession, user_id: int
    ) -> tuple[User, Profile | None] | None:
        """Fetch user with profile, creating profile if missing."""
        user = await self.repo.get_by_id(
            session, user_id, with_profile=True, with_passkey=True
        )
        if not user:
            return None
        if not user.profile:
            await self.repo.ensure_profile(session, user)
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
        session: AsyncSession,
        username: str,
        password: str,
        email: str,
        email_code: str,
        redis: AsyncRedis,
    ) -> User | None:
        """Register new user after validating email code.

        Returns None if username taken, email taken, or code invalid.
        """
        if await self.repo.get_by_username(session, username):
            return None

        if await self.repo.is_email_taken(session, email):
            return None

        code_key = f"signup_code:{email}"
        stored_code = await redis.get(code_key)
        if stored_code is None or stored_code != email_code:
            return None

        user = await self.repo.create_user(
            session, username=username, password=password
        )
        await self.repo.create_profile(
            session, user_id=user.id, email=email
        )
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

    async def update_settings(
        self, session: AsyncSession, user: User, data: UserSettingsIn
    ) -> dict:
        """Update user profile fields, raising ValueError on duplicate username."""
        if data.username != user.username:
            if await self.repo.is_username_taken(
                session, data.username, exclude_user_id=user.id
            ):
                raise ValueError("Username already exists")
            await self.repo.set_username_by_id(
                session, user.id, data.username
            )

        await self.repo.set_name_by_id(session, user.id, data.name)

        if data.password:
            await self.repo.set_password_by_id(
                session, user.id, data.password
            )

        profile = await self.repo.get_profile(session, user.id)
        if not profile:
            profile = await self.repo.create_profile(session, user.id)

        await self.repo.update_profile(
            session,
            profile,
            email=data.email,
            gender=data.gender,
            mobile=data.mobile,
        )

        # Re-fetch to get actual DB values (user may be detached)
        updated_user = await self.repo.get_by_id(
            session, user.id, with_profile=True
        )
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

    async def upload_avatar(
        self, session: AsyncSession, user: User, image
    ) -> dict:
        """Upload and compress avatar to 256px thumbnail."""
        profile = await self.repo.get_profile(session, user.id)
        if not profile:
            profile = await self.repo.create_profile(session, user.id)

        if image and image.filename:
            image_filename = save_upload_image(image, str(user.id))
            media_root = _get_media_root()
            original_path = media_root / image_filename
            thumbnail_filename = image_filename.replace(".", "-256.")
            thumbnail_path = media_root / thumbnail_filename
            compress_avartar(str(original_path), str(thumbnail_path))
            await self.repo.update_profile(
                session, profile, photo=thumbnail_filename
            )

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
        self, token: str, redis: AsyncRedis | None = None
    ) -> tuple[User, dict[str, str]] | None:
        """Validate a refresh token and issue a new token pair.

        When *redis* is provided, checks the presented token against the
        stored whitelist (if any) and rotates: the old entry is replaced
        by the new refresh token.  Without *redis* the check is skipped
        (stateless, backward-compatible).

        Returns (user, tokens_dict) on success, None if the token is
        invalid, expired, or fails the whitelist check.
        """
        try:
            user = await resolve_user_from_token(token)
        except Exception:
            return None
        if user is None:
            return None
        if redis is not None:
            from app.core.config import settings as _settings

            stored = await redis.get(f"refresh:{user.id}")
            if _settings.ENFORCE_REDIS_REFRESH:
                # 严格模式: 无白名单或 token 不匹配均拒绝
                if stored is None or stored != token:
                    return None
            else:
                # 兼容模式: 仅在有白名单且 token 不匹配时拒绝
                # (白名单不存在 = 旧 token / 非 Redis 签发的 token,放行)
                if stored is not None and stored != token:
                    return None
        tokens = await self.create_tokens(user, redis)
        return user, tokens
