from __future__ import annotations

from fastapi import APIRouter, WebSocket
from redis.asyncio import Redis

from app.services.ws_visitor_service import WsVisitorService

router = APIRouter(prefix="/publicv2", tags=["publicv2"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    redis: Redis = websocket.app.state.redis

    await WsVisitorService.handle_connection(websocket, redis)
