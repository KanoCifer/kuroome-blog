"""Unit tests for app.services.base — BaseService pure logic (no DB)."""

from __future__ import annotations

import pytest

from app.core.exceptions import ForbiddenError, NotFoundError
from app.services.base import BaseService


class _FakeEntity:
    """Minimal object with a user_id attribute for ownership tests."""

    def __init__(self, user_id: int) -> None:
        self.user_id = user_id


svc = BaseService()


def test_require_found_returns_entity_when_not_none():
    entity = _FakeEntity(user_id=1)
    assert svc.require_found(entity) is entity


def test_require_found_raises_not_found_when_none():
    with pytest.raises(NotFoundError):
        svc.require_found(None)


def test_require_found_custom_message():
    with pytest.raises(NotFoundError) as exc_info:
        svc.require_found(None, message="custom msg")
    assert exc_info.value.message == "custom msg"


def test_require_owned_passes_when_user_matches():
    entity = _FakeEntity(user_id=42)
    # Should not raise
    svc.require_owned(entity, user_id=42)


def test_require_owned_raises_forbidden_when_user_differs():
    entity = _FakeEntity(user_id=1)
    with pytest.raises(ForbiddenError):
        svc.require_owned(entity, user_id=2)


def test_require_owned_custom_message():
    with pytest.raises(ForbiddenError) as exc_info:
        svc.require_owned(_FakeEntity(1), user_id=99, message="no access")
    assert exc_info.value.message == "no access"


def test_get_owned_returns_entity_when_valid():
    entity = _FakeEntity(user_id=5)
    result = svc.get_owned(entity, user_id=5)
    assert result is entity


def test_get_owned_raises_not_found_when_none():
    with pytest.raises(NotFoundError) as exc_info:
        svc.get_owned(None, user_id=1, not_found_msg="missing")
    assert exc_info.value.message == "missing"


def test_get_owned_raises_forbidden_when_wrong_owner():
    with pytest.raises(ForbiddenError) as exc_info:
        svc.get_owned(_FakeEntity(1), user_id=2, forbidden_msg="denied")
    assert exc_info.value.message == "denied"


def test_require_owned_handles_entity_without_user_id_attr():
    """Entity lacking user_id attribute should raise ForbiddenError."""

    class NoUserId:
        pass

    with pytest.raises(ForbiddenError):
        svc.require_owned(NoUserId(), user_id=1)  # type: ignore[arg-type]
