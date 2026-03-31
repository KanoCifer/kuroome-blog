from __future__ import annotations

import random
import secrets
import time
from datetime import timedelta
from urllib.parse import urlencode

import orjson
from fastapi import Request
from redis.asyncio import Redis as AsyncRedis
from webauthn import options_to_json
from webauthn.helpers.structs import (
    PublicKeyCredentialCreationOptions,
    PublicKeyCredentialRequestOptions,
)

from app.api.des.auth import manager
from app.core.config import settings
from app.core.security import (
    generate_passkey_authentication_options,
    generate_passkey_registration_options,
    generate_pkce_pair,
)
from app.models.models import Profile, User
from app.repositories.user_repo import UserRepo
from app.schemas.schemas import UserSettingsIn
from app.schemas.user import UserInfo, UserProfileOut
from app.utils.base64url import base64url_decode, base64url_encode
from app.utils.compress_image import compress_avartar
from app.utils.media import _get_media_root, save_upload_image
from app.utils.security import (
    verify_passkey_authentication_response,
    verify_passkey_registration_response,
)


class UserService:
    """User business logic layer.

    Handles authentication, registration, profile management,
    passkey operations, and GitHub OAuth integration.
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

    async def logout(self, user: User, redis: AsyncRedis) -> None:
        """Mark user offline and remove from online tracking."""
        await self.repo.set_active(user, False)
        await redis.zrem("online:users", str(user.id))
        await redis.delete(f"online:{user.id}")

    async def record_heartbeat(self, user: User, redis: AsyncRedis) -> None:
        """Update user's last-seen timestamp in Redis sorted set.

        Uses sorted set for efficient online user queries.
        TTL of 600s auto-cleans stale entries.
        """

        now = int(time.time())
        await redis.zadd("online:users", {str(user.id): now})
        await redis.set(f"online:{user.id}", str(now), ex=600)

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

    def user_to_dict(
        self, user: User, profile: Profile | None = None
    ) -> UserInfo:
        """Serialize user + profile to dict for API responses."""
        user_info = UserInfo(
            id=user.id,
            username=user.username,
            is_admin=user.is_admin,
            name=user.name,
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

    async def update_settings(
        self, user: User, data: UserSettingsIn
    ) -> UserProfileOut:
        """Update user profile fields, raising ValueError on duplicate username."""
        if data.username != user.username:
            if await self.repo.is_username_taken(
                data.username, exclude_user_id=user.id
            ):
                raise ValueError("Username already exists")
            await self.repo.set_username(user, data.username)

        await self.repo.set_name(user, data.name)

        if data.password:
            await self.repo.set_password(user, data.password)

        profile = await self.repo.get_profile(user.id)
        if not profile:
            profile = await self.repo.create_profile(user.id)

        await self.repo.update_profile(
            profile,
            email=data.email,
            gender=data.gender,
            mobile=data.mobile,
        )

        return UserProfileOut(
            id=user.id,
            name=user.name,
            username=user.username,
            gender=profile.gender,
            email=profile.email,
            mobile=profile.mobile,
            photo=profile.photo,
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
    # Passkey
    # ------------------------------------------------------------------ #

    async def has_passkey(self, user: User) -> bool:
        """Check if user has a registered passkey credential."""
        cred = await self.repo.get_passkey_by_user_id(user.id)
        return cred is not None

    async def create_registration_options(
        self, redis: AsyncRedis, user: User
    ) -> PublicKeyCredentialCreationOptions:
        """创建Passkey注册选项并存储挑战码到Redis"""
        if await self.has_passkey(user):
            raise ValueError("用户已注册 Passkey")

        options: PublicKeyCredentialCreationOptions = (
            generate_passkey_registration_options(str(user.id))
        )

        challenge: str = base64url_encode(options.challenge)
        await redis.set(
            f"passkey:registration:challenge:{user.id}",
            challenge,
            ex=300,
        )
        return orjson.loads(options_to_json(options))

    async def create_options(
        self, redis: AsyncRedis
    ) -> PublicKeyCredentialRequestOptions:
        """创建Passkey认证选项并存储挑战码到Redis"""
        options: PublicKeyCredentialRequestOptions = (
            generate_passkey_authentication_options()
        )

        challenge_bytes: bytes = options.challenge
        challenge: str = base64url_encode(challenge_bytes)

        await redis.set(
            f"passkey:authentication:challenge:{challenge}",
            challenge,
            ex=300,
        )
        return orjson.loads(options_to_json(options))

    async def register_passkey(
        self,
        user: User,
        response: dict,
        expected_challenge: str,
    ) -> bool:
        """Verify and store passkey registration response.

        Returns False if user already has passkey or verification fails.
        """

        if await self.has_passkey(user):
            return False

        verification = verify_passkey_registration_response(
            response, expected_challenge
        )
        if not verification:
            return False

        credential_id = base64url_encode(verification.credential_id)
        public_key = base64url_encode(verification.credential_public_key)

        await self.repo.create_passkey(
            user_id=user.id,
            credential_id=credential_id,
            public_key=public_key,
            sign_count=verification.sign_count,
        )
        return True

    async def authenticate_passkey(
        self,
        response: dict,
        expected_challenge: str,
        request: Request,
    ) -> tuple[User | None, str | None]:
        """Verify passkey authentication and login user.

        Returns (user, None) on success, (None, error_msg) on failure.
        """

        try:
            client_data_json_b64 = response["response"]["clientDataJSON"]
            client_data_json_bytes = base64url_decode(
                client_data_json_b64
            ).encode("utf-8")
            client_data = orjson.loads(client_data_json_bytes)
            _challenge = client_data["challenge"]
        except KeyError, ValueError, orjson.JSONDecodeError:
            return None, "无效的 Passkey 认证响应"

        try:
            credential_id = response["id"]
        except KeyError:
            return None, "无效的 Passkey 凭证 ID"

        credential = await self.repo.get_passkey_by_credential_id(
            credential_id
        )
        if credential is None:
            return None, "Passkey 凭证不存在"

        user: User = credential.user
        if user is None:
            return None, "用户不存在"

        verification = verify_passkey_authentication_response(
            response=response,
            expected_challenge=expected_challenge,
            credential_public_key=credential.public_key,
            sign_count=credential.sign_count,
        )
        if not verification:
            return None, "Passkey 认证验证失败"

        await self.repo.update_passkey_sign_count(
            credential, verification.new_sign_count
        )
        await self.record_login(user, request)
        return user, None

    async def complete_passkey_login(
        self,
        assertion_response: dict,
        redis: AsyncRedis,
        request: Request,
    ) -> tuple[User, dict[str, str], None] | tuple[None, None, str]:
        """Complete passkey login flow: validate challenge → authenticate → create tokens.

        Returns (user, tokens, None) on success, (None, None, error_msg) on failure.
        """
        # Parse challenge from clientDataJSON
        try:
            client_data_json_b64 = assertion_response["response"][
                "clientDataJSON"
            ]
            client_data_json_bytes = base64url_decode(client_data_json_b64)
            client_data = orjson.loads(client_data_json_bytes)
            challenge = client_data["challenge"]
        except KeyError, ValueError, orjson.JSONDecodeError:
            return None, None, "无效的 Passkey 认证响应"

        # Validate and consume Redis challenge
        expected_challenge = await redis.get(
            f"passkey:authentication:challenge:{challenge}"
        )
        if not expected_challenge:
            return None, None, "Passkey 认证会话已过期或不存在"

        await redis.delete(f"passkey:authentication:challenge:{challenge}")

        # Authenticate and create tokens
        user, error = await self.authenticate_passkey(
            assertion_response, expected_challenge, request
        )
        if error or user is None:
            return None, None, error or "认证失败"

        tokens = self.create_tokens(user)
        return user, tokens, None

    async def complete_passkey_registration(
        self,
        user: User,
        response: dict,
        redis: AsyncRedis,
    ) -> str | None:
        """Complete passkey registration flow: validate challenge → register credential.

        Returns None on success, error message on failure.
        """
        expected_challenge = await redis.get(
            f"passkey:registration:challenge:{user.id}"
        )
        if not expected_challenge:
            return "Passkey 注册会话已过期或不存在"

        await redis.delete(f"passkey:registration:challenge:{user.id}")

        success = await self.register_passkey(
            user, response, expected_challenge
        )
        if not success:
            return "您的账户已经绑定了Passkey或验证失败"

        return None

    async def delete_passkey(self, user: User) -> bool:
        """Delete user's passkey credential. Returns False if none exists."""
        cred = await self.repo.get_passkey_by_user_id(user.id)
        if not cred:
            return False
        await self.repo.delete_passkey(cred)
        return True

    # ------------------------------------------------------------------ #
    # GitHub OAuth
    # ------------------------------------------------------------------ #

    def generate_oauth_url(
        self, *, mode: str = "login"
    ) -> tuple[str, str, str, str]:
        """Generate GitHub OAuth URL with PKCE challenge.

        Returns (auth_url, state, code_verifier, mode).
        """
        state = secrets.token_urlsafe(32)
        code_verifier, code_challenge = generate_pkce_pair()

        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "state": state,
            "scope": "read:user user:email",
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        auth_url = "https://github.com/login/oauth/authorize?" + urlencode(
            params
        )
        return auth_url, state, code_verifier, mode

    async def find_or_create_github_user(
        self,
        github_id: int,
        username: str,
        email: str,
        avatar_url: str | None = None,
    ) -> User:
        """Find existing GitHub user or create new account.

        Appends random suffix if username conflicts.
        """
        user = await self.repo.get_by_github_id(github_id)
        if user:
            return user

        if await self.repo.is_username_taken(username):
            username = f"{username}_{secrets.token_urlsafe(4)}"

        user = await self.repo.create_user(
            username=username,
            password=secrets.token_urlsafe(16),
            name=username,
            github_id=github_id,
        )
        await self.repo.create_profile(
            user_id=user.id, email=email, photo=avatar_url or "default.png"
        )
        await self.repo.refresh_user(user)
        return user

    async def bind_github(
        self,
        user: User,
        github_id: int,
        avatar_url: str | None,
    ) -> str:
        """Link GitHub account to user.

        Returns "success" or "github_already_bound" if taken.
        """
        existing = await self.repo.get_by_github_id(github_id)
        if existing and existing.id != user.id:
            return "github_already_bound"

        await self.repo.set_github_id(user, github_id)
        profile = await self.repo.get_profile(user.id)
        if profile and not profile.photo:
            await self.repo.update_profile(profile, photo=avatar_url)
        return "success"

    async def unbind_github(self, user: User) -> None:
        """Remove GitHub account linkage from user."""
        await self.repo.set_github_id(user, None)

    async def handle_github_login_callback(
        self,
        github_id: int,
        username: str,
        email: str,
        avatar_url: str | None,
        request: Request,
    ) -> User:
        """Handle GitHub OAuth callback, linking by email if possible.

        Prefers linking to existing non-GitHub account with matching email.
        """
        existing_by_email = None
        if email and not email.endswith("@github.com"):
            existing_by_email = await self.repo.get_by_email(email)

        if existing_by_email and not existing_by_email.github_id:
            await self.repo.set_github_id(existing_by_email, github_id)
            profile = existing_by_email.profile
            if profile and not profile.photo:
                await self.repo.update_profile(profile, photo=avatar_url)
            user = existing_by_email
        else:
            user = await self.find_or_create_github_user(
                github_id, username, email, avatar_url
            )

        await self.record_login(user, request)
        return user
