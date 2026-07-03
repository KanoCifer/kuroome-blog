"""Unit tests for app.core.security — PKCE pair generation."""

from __future__ import annotations

import base64
import hashlib

from app.core.security import generate_pkce_pair


def test_pkce_returns_tuple_of_two_strings():
    verifier, challenge = generate_pkce_pair()
    assert isinstance(verifier, str)
    assert isinstance(challenge, str)


def test_pkce_verifier_length_in_rfc_range():
    verifier, _ = generate_pkce_pair()
    # RFC 7636: code_verifier must be 43-128 characters
    assert 43 <= len(verifier) <= 128


def test_pkce_challenge_is_sha256_of_verifier():
    verifier, challenge = generate_pkce_pair()
    expected = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .decode()
        .rstrip("=")
    )
    assert challenge == expected


def test_pkce_produces_unique_pairs_each_call():
    v1, c1 = generate_pkce_pair()
    v2, c2 = generate_pkce_pair()
    assert v1 != v2
    assert c1 != c2
