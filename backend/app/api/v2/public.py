from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, WebSocket

if TYPE_CHECKING:
    from redis.asyncio import Redis

from app.api.des.appstate import get_app_state
from app.appstate import AppState
from app.core.response import APIResponse
from app.plugins.cache import redis_cache
from app.services.ws_visitor_service import WsVisitorService

router = APIRouter(prefix="/publicv2", tags=["publicv2"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    redis: Redis = websocket.app.state.redis

    await WsVisitorService.handle_connection(websocket, redis)


@router.get("/changelogs")
@redis_cache(ttl=3600, exclude=["state"])
async def get_changelogs(state: AppState = Depends(get_app_state)):
    return APIResponse(data=await state.public_svc.get_changelogs())
