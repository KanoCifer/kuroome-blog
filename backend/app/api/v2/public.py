from __future__ import annotations

from fastapi import APIRouter, Depends, WebSocket
from redis.asyncio import Redis

from app.api.des.des import public_service_dep
from app.core.response import APIResponse
from app.services.public_service import PublicService
from app.services.ws_visitor_service import WsVisitorService
from app.plugins.cache import redis_cache

router = APIRouter(prefix="/publicv2", tags=["publicv2"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    redis: Redis = websocket.app.state.redis

    await WsVisitorService.handle_connection(websocket, redis)


@router.get("/changelogs")
@redis_cache(ttl=3600)
async def get_changelogs(svc: PublicService = Depends(public_service_dep)):
    return APIResponse(data=await svc.get_changelogs())
