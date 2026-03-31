import base64
import hashlib
import secrets

from webauthn import (
    base64url_to_bytes,
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.authentication.verify_authentication_response import (
    VerifiedAuthentication,
)
from webauthn.helpers.structs import (
    PublicKeyCredentialCreationOptions,
    PublicKeyCredentialRequestOptions,
)
from webauthn.registration.verify_registration_response import (
    VerifiedRegistration,
)

from app.core.config import settings


def generate_pkce_pair() -> tuple[str, str]:
    """
    生成 OAuth PKCE 验证对
    返回: (code_verifier, code_challenge)
    符合 RFC 7636 标准
    """
    # 1. 生成 code_verifier: 43-128 个字符的加密安全随机字符串
    code_verifier = (
        base64.urlsafe_b64encode(secrets.token_bytes(32))
        .decode("utf-8")
        .rstrip("=")
    )

    # 2. 生成 code_challenge: code_verifier 的 SHA256 哈希后做 Base64URL 编码
    code_challenge = (
        base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode("utf-8")).digest()
        )
        .decode("utf-8")
        .rstrip("=")
    )

    return code_verifier, code_challenge


def generate_passkey_registration_options(
    user_id: str,
) -> PublicKeyCredentialCreationOptions:
    """生成 Passkey 注册选项"""
    options: PublicKeyCredentialCreationOptions = (
        generate_registration_options(
            rp_name="Kuroome's Blog",
            rp_id=settings.WEBAUTHN_RP_ID,
            user_name=user_id,
        )
    )
    return options


def verify_passkey_registration_response(
    response: dict, expected_challenge: str
) -> VerifiedRegistration:
    """验证 Passkey 注册响应"""
    verification: VerifiedRegistration = verify_registration_response(
        credential=response,
        expected_challenge=base64url_to_bytes(expected_challenge),
        expected_rp_id=settings.WEBAUTHN_RP_ID,
        expected_origin=settings.WEBAUTHN_ORIGIN,
    )
    return verification


def generate_passkey_authentication_options() -> (
    PublicKeyCredentialRequestOptions
):
    """生成 Passkey 认证选项"""
    options: PublicKeyCredentialRequestOptions = (
        generate_authentication_options(
            rp_id=settings.WEBAUTHN_RP_ID,
        )
    )
    return options


def verify_passkey_authentication_response(
    response: dict,
    expected_challenge: str,
    credential_public_key: str,
    sign_count: int,
) -> VerifiedAuthentication:
    """验证 Passkey 认证响应"""
    verification: VerifiedAuthentication = verify_authentication_response(
        credential=response,
        expected_challenge=base64url_to_bytes(expected_challenge),
        credential_public_key=base64url_to_bytes(credential_public_key),
        expected_rp_id=settings.WEBAUTHN_RP_ID,
        expected_origin=settings.WEBAUTHN_ORIGIN,
        credential_current_sign_count=sign_count,
    )
    return verification
