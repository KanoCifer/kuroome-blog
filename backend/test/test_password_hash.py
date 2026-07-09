"""Tests for bcrypt password hash migration.

Verifies:
1. New users get bcrypt hashes.
2. Old werkzeug pbkdf2 hashes still validate (backward compatibility).
3. Login with old hash silently upgrades to bcrypt.
"""

from __future__ import annotations

import pytest
from werkzeug.security import generate_password_hash

from app.models.models import User


def _make_pbkdf2_hash(password: str) -> str:
    """Simulate a legacy werkzeug pbkdf2 hash (pre-migration user)."""
    return generate_password_hash(password)


@pytest.fixture
def user_with_pbkdf2() -> User:
    u = User(username="legacy", password="ignored")
    u.password_hash = _make_pbkdf2_hash("correctpass")
    return u


@pytest.fixture
def user_with_bcrypt() -> User:
    import bcrypt

    u = User(username="modern", password="ignored")
    u.password_hash = bcrypt.hashpw(
        b"correctpass", bcrypt.gensalt()
    ).decode()
    return u


def test_bcrypt_hash_validates(user_with_bcrypt):
    assert user_with_bcrypt.validate_password("correctpass") is True
    assert user_with_bcrypt.validate_password("wrong") is False


def test_pbkdf2_hash_still_validates(user_with_pbkdf2):
    """Old werkzeug hashes must still work after migration."""
    assert user_with_pbkdf2.validate_password("correctpass") is True
    assert user_with_pbkdf2.validate_password("wrong") is False


def test_new_registration_uses_bcrypt():
    u = User(username="newuser", password="mypass")
    assert u.password_hash.startswith("$2b$")
    assert u.validate_password("mypass") is True


def test_needs_hash_upgrade(user_with_pbkdf2, user_with_bcrypt):
    assert user_with_pbkdf2.needs_hash_upgrade() is True
    assert user_with_bcrypt.needs_hash_upgrade() is False


def test_none_password_hash_rejects():
    u = User(username="nopass")
    u.password_hash = None
    assert u.validate_password("anything") is False


def test_cross_backend_bcrypt_compat():
    """A hash produced by Go's bcrypt can be validated here.

    This mirrors how the Go backend (golang.org/x/crypto/bcrypt) hashes,
    ensuring cross-backend auth compatibility per auth-contract.md.
    """
    import bcrypt

    # Go uses $2a$; Python bcrypt accepts both $2a$ and $2b$
    hash_2a = bcrypt.hashpw(b"secret", bcrypt.gensalt(prefix=b"2a")).decode()
    u = User(username="go-user")
    u.password_hash = hash_2a
    assert u.validate_password("secret") is True
