"""Message board router for FastAPI.

This module provides endpoints for the message board functionality,
including message submission, listing, and admin moderation.
"""

from __future__ import annotations

from datetime import UTC, datetime

from beanie import SortDirection
from fastapi import APIRouter, Depends, Request

from app.api.des.auth import manager
from app.api.des.limiter import limiter
from app.models.beanie import MessageBoard
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import (
    MessageIn,
)

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("", response_model=APIResponse)
async def get_messages():
    """Get approved messages from message board."""
    try:
        messages = (
            await MessageBoard.find({"review": 1})
            .sort([("created_at", SortDirection.DESCENDING)])
            .to_list(length=None)
        )

        messages_list = []
        for msg in messages:
            messages_list.append(
                {
                    "id": str(msg.id),
                    "name": msg.name,
                    "message": msg.message,
                    "created_at": (
                        msg.created_at.isoformat() if msg.created_at else None
                    ),
                    "from_admin": msg.from_admin
                    if hasattr(msg, "from_admin")
                    else False,
                }
            )

        return APIResponse.ok(
            data={"messages": messages_list},
            message="Messages retrieved successfully",
        )
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to retrieve messages: {e!s}", code=500
        )


@router.post("", response_model=APIResponse)
@limiter.limit("10/minute")
async def create_message(
    request: Request,
    message_in: MessageIn,
    user: User | None = Depends(manager),
):
    """Submit a new message to message board (pending review)."""
    from html import escape

    # Server-side sanitize: convert any markup to escaped plain-text to prevent XSS
    name = str(escape(message_in.name.strip()))
    message = str(escape(message_in.message.strip()))

    is_admin = user is not None and user.is_admin

    message_entry = MessageBoard(
        name=name,
        message=message,
        created_at=datetime.now(UTC),
        review=0,  # 0 = pending review, 1 = approved
        from_admin=is_admin,
    )

    try:
        await MessageBoard.insert_one(message_entry)

        return APIResponse.ok(
            data={"id": str(message_entry.id)},
            message="Message submitted successfully, pending review",
        )
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to submit message: {e!s}",
            code=500,
        )


# =============================================================================
# Message Board Admin APIs have been moved to admin.py
# =============================================================================
