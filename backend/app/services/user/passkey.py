"""Passkey (WebAuthn) authentication service."""

from __future__ import annotations

import orjson
from fastapi import Request
from redis.asyncio import Redis as AsyncRedis
from webauthn.helpers.structs import (
    PublicKeyCredentialCreationOptions,
    PublicKeyCredentialRequestOptions,
)

from app.core.config import settings
from app.core.security import (
    generate_passkey_authentication_options,
    generate_passkey_registration_options,
    verify_passkey_authentication_response,
    verify_passkey_registration_response,
)
from app.models.models import User
from app.services.user.core import UserService
from app.utils.base64url import base64url_decode, base64url_encode


class PasskeyService:
    """WebAuthn passkey registration and authentication flows."""

    def __init__(self, user_service: UserService) -> None:
        self.user_service = user_service
        self.repo = user_service.repo

    async def has_passkey(self, user: User) -> bool:
        """Check if user has a registered passkey credential."""
        cred = await self.repo.get_passkey_by_user_id(user.id)
        return cred is not None

    async def create_registration_options(
        self, redis: AsyncRedis, user: User
    ) -> PublicKeyCredentialCreationOptions:
        """Create Passkey registration options and store challenge in Redis."""
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
        return options

    async def create_options(
        self, redis: AsyncRedis
    ) -> PublicKeyCredentialRequestOptions:
        """Create Passkey authentication options and store challenge in Redis."""
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
        return options

    async def register_passkey(
        self,
        user: User,
        response: dict,
        expected_challenge: str,
        expected_origin: str,
    ) -> bool:
        """Verify and store passkey registration response.

        Returns False if user already has passkey or verification fails.
        """
        if await self.has_passkey(user):
            return False

        verification = verify_passkey_registration_response(
            response, expected_challenge, expected_origin
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
        expected_origin: str,
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
            expected_origin=expected_origin,
        )
        if not verification:
            return None, "Passkey 认证验证失败"

        await self.repo.update_passkey_sign_count(
            credential, verification.new_sign_count
        )
        await self.user_service.record_login(user, request)
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
        origin = settings.WEBAUTHN_ORIGIN

        try:
            client_data_json_b64 = assertion_response["response"][
                "clientDataJSON"
            ]
            client_data_json_bytes = base64url_decode(client_data_json_b64)
            client_data = orjson.loads(client_data_json_bytes)
            challenge = client_data["challenge"]
        except KeyError, ValueError, orjson.JSONDecodeError:
            return None, None, "无效的 Passkey 认证响应"

        expected_challenge = await redis.get(
            f"passkey:authentication:challenge:{challenge}"
        )
        if not expected_challenge:
            return None, None, "Passkey 认证会话已过期或不存在"

        await redis.delete(f"passkey:authentication:challenge:{challenge}")

        user, error = await self.authenticate_passkey(
            assertion_response, expected_challenge, origin, request
        )
        if error or user is None:
            return None, None, error or "认证失败"

        tokens = self.user_service.create_tokens(user)
        return user, tokens, None

    async def complete_passkey_registration(
        self,
        user: User,
        response: dict,
        redis: AsyncRedis,
        expected_origin: str,
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
            user, response, expected_challenge, expected_origin
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
