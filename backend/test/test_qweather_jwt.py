"""Unit tests for app.utils.qweather_jwt — JWT generation and structure."""

from __future__ import annotations

import time
from collections.abc import Callable
from unittest.mock import patch

import pytest

import jwt
from app.utils.qweather_jwt import generate_qweather_jwt


@pytest.fixture
def mock_private_key(tmp_path):
    """Generate a temporary Ed25519 private key for testing."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import (
        Ed25519PrivateKey,
    )
    from cryptography.hazmat.primitives.serialization import (
        Encoding,
        NoEncryption,
        PrivateFormat,
    )

    private_key = Ed25519PrivateKey.generate()
    pem = private_key.private_bytes(
        Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
    )
    key_file = tmp_path / "test_key.pem"
    key_file.write_bytes(pem)
    return key_file.read_text()


def _mock_settings(mock_private_key: str) -> Callable:
    def _patch(settings_obj):
        settings_obj.JWT_PRIVATE_KEY = mock_private_key
        return settings_obj

    return _patch


def test_generate_returns_non_empty_string(mock_private_key):
    with patch("app.utils.qweather_jwt.get_settings") as mock_get:
        mock_get.return_value.JWT_PRIVATE_KEY = mock_private_key
        token = generate_qweather_jwt()
    assert isinstance(token, str)
    assert len(token) > 0


def test_generated_jwt_has_three_segments(mock_private_key):
    with patch("app.utils.qweather_jwt.get_settings") as mock_get:
        mock_get.return_value.JWT_PRIVATE_KEY = mock_private_key
        token = generate_qweather_jwt()
    parts = token.split(".")
    assert len(parts) == 3


def test_jwt_header_uses_eddsa_algorithm(mock_private_key):
    with patch("app.utils.qweather_jwt.get_settings") as mock_get:
        mock_get.return_value.JWT_PRIVATE_KEY = mock_private_key
        token = generate_qweather_jwt()

    header = jwt.get_unverified_header(token)
    assert header["alg"] == "EdDSA"
    assert "kid" in header


def test_jwt_payload_contains_required_claims(mock_private_key):
    with patch("app.utils.qweather_jwt.get_settings") as mock_get:
        mock_get.return_value.JWT_PRIVATE_KEY = mock_private_key
        before = int(time.time())
        token = generate_qweather_jwt()
        after = int(time.time())

    # Decode without verification — we only check claim structure
    payload = jwt.decode(
        token, options={"verify_signature": False}, algorithms=["EdDSA"]
    )
    assert "iat" in payload
    assert "exp" in payload
    assert "sub" in payload
    # iat should be ~10 seconds before now
    assert before - 15 <= payload["iat"] <= after
    # exp should be ~24h after iat (allow 1s tolerance for clock drift)
    assert 86380 <= payload["exp"] - payload["iat"] <= 86400


def test_jwt_signature_is_validatable(mock_private_key, tmp_path):
    """Verify the JWT can be verified against the matching public key."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import (
        Ed25519PrivateKey,
    )
    from cryptography.hazmat.primitives.serialization import (
        Encoding,
        NoEncryption,
        PrivateFormat,
        PublicFormat,
    )

    private_key = Ed25519PrivateKey.generate()
    pem_private = private_key.private_bytes(
        Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
    )
    pem_public = private_key.public_key().public_bytes(
        Encoding.PEM, PublicFormat.SubjectPublicKeyInfo
    )

    with patch("app.utils.qweather_jwt.get_settings") as mock_get:
        mock_get.return_value.JWT_PRIVATE_KEY = pem_private.decode()
        token = generate_qweather_jwt()

    # Should not raise
    jwt.decode(token, pem_public, algorithms=["EdDSA"])
