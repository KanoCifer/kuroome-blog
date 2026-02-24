"""Message board router for FastAPI.

This module provides endpoints for the message board functionality,
including message submission, listing, and admin moderation.
"""

from __future__ import annotations

from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies.auth import manager
from app.dependencies.limiter import limiter
from app.dependencies.mongo import get_mongo_db
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import (
    MessageIn,
)

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("", response_model=APIResponse)
async def get_messages(
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db),
):
    """Get approved messages from message board."""
    try:
        messages = (
            await mongo_db.message_board.find({"review": 1})
            .sort("created_at", -1)
            .to_list(length=None)
        )

        messages_list = []
        for msg in messages:
            messages_list.append(
                {
                    "id": str(msg["_id"]),
                    "name": msg["name"],
                    "message": msg["message"],
                    "created_at": (
                        msg["created_at"].isoformat()
                        if msg.get("created_at")
                        else None
                    ),
                    "from_admin": msg.get("from_admin", False),
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
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    user: User | None = Depends(manager),
):
    """Submit a new message to message board (pending review)."""
    from html import escape

    # Server-side sanitize: convert any markup to escaped plain-text to prevent XSS
    name = str(escape(message_in.name.strip()))
    message = str(escape(message_in.message.strip()))

    is_admin = user is not None and user.is_admin

    message_entry = {
        "name": name,
        "message": message,
        "created_at": datetime.now(UTC),
        "review": 0,  # 0 = pending review, 1 = approved
        "from_admin": is_admin,
    }

    try:
        result = await mongo_db.message_board.insert_one(message_entry)

        return APIResponse.ok(
            data={"id": str(result.inserted_id)},
            message="Message submitted successfully, pending review",
        )
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to submit message: {e!s}",
            code=500,
        )


# =============================================================================
# Message Board Admin APIs
# =============================================================================
# These endpoints require admin privileges (user ID = 1)


@router.get("/admin/messages", response_model=APIResponse)
async def get_admin_messages(
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(manager),
):
    """Get all messages (pending and approved) for admin review.

    Requires admin privileges (user ID = 1).
    """
    if current_user.id != 1:
        return APIResponse.error(
            message="You don't have permission to access this resource.",
            code=403,
        )

    try:
        # Get pending messages (review = 0)
        pending_messages = (
            await mongo_db.message_board.find({"review": 0})
            .sort("created_at", -1)
            .to_list(length=None)
        )

        # Get approved messages (review = 1), limit to 50
        approved_messages = (
            await mongo_db.message_board.find({"review": 1})
            .sort("created_at", -1)
            .limit(50)
            .to_list(length=None)
        )

        def format_message(msg: dict) -> dict:
            return {
                "id": str(msg["_id"]),
                "name": msg["name"],
                "message": msg["message"],
                "created_at": (
                    msg["created_at"].isoformat()
                    if msg.get("created_at")
                    else None
                ),
                "review": msg.get("review", 0),
            }

        return APIResponse(
            status="success",
            data={
                "pending": [format_message(msg) for msg in pending_messages],
                "approved": [format_message(msg) for msg in approved_messages],
            },
            message="Messages retrieved successfully",
        )
    except Exception as e:
        return APIResponse(
            status="error",
            message=f"Failed to retrieve messages: {e!s}",
            code=500,
        )


@router.post("/admin/messages/{message_id}/approve", response_model=dict)
async def approve_message(
    message_id: str,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(manager),
):
    """Approve a pending message.

    Requires admin privileges (user ID = 1).
    """
    if current_user.id != 1:
        return APIResponse(
            status="error",
            message="You don't have permission to perform this action.",
            code=403,
        )

    try:
        obj_id = ObjectId(message_id)
    except Exception:
        return APIResponse(
            status="error", message="Invalid message ID.", code=400
        )

    try:
        result = await mongo_db.message_board.update_one(
            {"_id": obj_id}, {"$set": {"review": 1}}
        )

        if result.modified_count > 0:
            return APIResponse.ok(message="Message has been approved.")
        else:
            return APIResponse.error(
                message="Message not found or already approved.",
                code=404,
            )
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to approve message: {e!s}",
            code=500,
        )


@router.delete("/admin/messages/{message_id}/delete", response_model=dict)
async def delete_message(
    message_id: str,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(manager),
):
    """Delete a message.

    Requires admin privileges (user ID = 1).
    """
    if current_user.id != 1:
        return APIResponse.error(
            message="You don't have permission to perform this action.",
            code=403,
        )

    try:
        obj_id = ObjectId(message_id)
    except Exception:
        return APIResponse.error(message="Invalid message ID.", code=400)

    try:
        result = await mongo_db.message_board.delete_one({"_id": obj_id})

        if result.deleted_count > 0:
            return APIResponse.ok(message="Message has been deleted.")
        else:
            return APIResponse.error(message="Message not found.", code=404)
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to delete message: {e!s}",
            code=500,
        )
