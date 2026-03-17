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

from app.configs.config import settings


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
