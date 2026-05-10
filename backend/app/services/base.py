"""Base service with common entity ownership and existence validation.

Reduces repetitive None-checking and ownership verification in API layer.
"""

from __future__ import annotations

from typing import TypeVar

from app.core.exceptions import ForbiddenError, NotFoundError

T = TypeVar("T")


class BaseService:
    """Base service providing standardized existence and ownership checks.

    Services inherit from this and call require_found / require_owned
    instead of returning None + letting API handle the branching.
    """

    @staticmethod
    def require_found(
        entity: T | None, message: str = "Resource not found"
    ) -> T:
        """Raise NotFoundError if entity is None, otherwise return it."""
        if entity is None:
            raise NotFoundError(message=message)
        return entity

    @staticmethod
    def require_owned(
        entity: object,
        user_id: int,
        message: str = "Forbidden",
    ) -> None:
        """Raise ForbiddenError if entity doesn't belong to user_id."""
        user_attr = getattr(entity, "user_id", None)
        if user_attr != user_id:
            raise ForbiddenError(message=message)

    def get_owned(
        self,
        entity: T | None,
        user_id: int,
        not_found_msg: str = "Resource not found",
        forbidden_msg: str = "Forbidden",
    ) -> T:
        """Combine require_found + require_owned."""
        self.require_found(entity, not_found_msg)
        self.require_owned(entity, user_id, forbidden_msg)
        return entity  # type: ignore[return-value]
