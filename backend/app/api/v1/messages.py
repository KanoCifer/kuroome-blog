"""Message board router for FastAPI.

This module provides endpoints for the message board functionality,
including message submission, listing, and admin moderation.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status

from app.api.des.auth import get_current_user_full
from app.api.des.des import message_service_dep
from app.api.des.limiter import limiter
from app.core.response import APIResponse
from app.models.models import User
from app.plugins.cache import redis_cache
from app.schemas.schemas import (
    MessageIn,
)
from app.services.message_service import MessageService

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("")
@redis_cache(ttl=120, exclude=["message_service"])
async def get_messages(
    message_service: MessageService = Depends(message_service_dep),
):
    """Get approved messages from message board."""
    payload = await message_service.get_messages()

    return APIResponse(
        data=payload,
        message="Messages retrieved successfully",
    )


@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_message(
    request: Request,
    message_in: MessageIn,
    user: User = Depends(get_current_user_full),
    message_service: MessageService = Depends(message_service_dep),
):
    """Submit a new message to message board (pending review)."""
    is_admin = user.is_admin

    data = await message_service.create_message(message_in, is_admin)

    return APIResponse(
        data=data,
        message="Message submitted successfully, pending review",
    )
