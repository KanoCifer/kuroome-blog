"""Message board router for FastAPI.

This module provides endpoints for the message board functionality,
including message submission, listing, and admin moderation.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.api.des.auth import manager
from app.api.des.des import message_service_dep
from app.api.des.limiter import limiter
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import (
    MessageIn,
)
from app.services.message_service import MessageService

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("", response_model=APIResponse)
async def get_messages(
    message_service: MessageService = Depends(message_service_dep),
):
    """Get approved messages from message board."""
    payload = await message_service.get_messages()

    return APIResponse.ok(
        data=payload,
        message="Messages retrieved successfully",
    )


@router.post("", response_model=APIResponse)
@limiter.limit("10/minute")
async def create_message(
    request: Request,
    message_in: MessageIn,
    user: User | None = Depends(manager),
    message_service: MessageService = Depends(message_service_dep),
):
    """Submit a new message to message board (pending review)."""
    is_admin = user is not None and user.is_admin

    data = await message_service.create_message(message_in, is_admin)

    return APIResponse.ok(
        data=data,
        message="Message submitted successfully, pending review",
    )


# =============================================================================
# Message Board Admin APIs have been moved to admin.py
# =============================================================================
