"""WebSocket visitor count service.

Encapsulates connection lifecycle, per-connection Redis pub/sub, and
count broadcasting so the API layer is a thin handler.

Each connection independently subscribes to a shared Redis pub/sub
channel — no process-bound state, so the design scales across multiple
uvicorn workers.
"""

from __future__ import annotations

import asyncio
import json
from contextlib import suppress
from typing import TYPE_CHECKING

from fastapi import WebSocket, WebSocketDisconnect

from app.core import logger

if TYPE_CHECKING:
    from redis.asyncio import Redis as AsyncRedis

VISITOR_COUNT_KEY = "ws:visitor_count"
VISITOR_COUNT_CHANNEL = "ws:visitor_count_changed"


class WsVisitorService:
    """Per-connection WebSocket visitor count manager.

    Each call to ``handle_connection`` spawns two concurrent tasks:

    * a Redis pub/sub listener that broadcasts count changes to the client
    * a WebSocket receiver that answers pings

    Visitor count is tracked via Redis INCR / DECR so it stays atomic
    across workers.
    """

    @classmethod
    async def publish_count(cls, redis: AsyncRedis) -> None:
        """Publish current visitor count to the Redis channel."""
        count = await redis.get(VISITOR_COUNT_KEY)
        current = int(count) if count else 0
        await redis.publish(
            VISITOR_COUNT_CHANNEL,
            json.dumps({"type": "count", "count": current}),
        )

    @classmethod
    async def _redis_listener(
        cls, redis: AsyncRedis, websocket: WebSocket
    ) -> None:
        """Subscribe to the visitor-count pub/sub channel and forward every
        message to the WebSocket client."""
        pubsub = redis.pubsub()
        await pubsub.subscribe(VISITOR_COUNT_CHANNEL)
        try:
            async for msg in pubsub.listen():
                if msg["type"] != "message":
                    continue
                data = msg["data"]
                if isinstance(data, bytes):
                    data = data.decode()
                try:
                    await websocket.send_text(data)
                except Exception:
                    break
        except asyncio.CancelledError:
            pass
        finally:
            with suppress(Exception):
                await pubsub.unsubscribe(VISITOR_COUNT_CHANNEL)

    @classmethod
    async def _ws_receiver(cls, websocket: WebSocket) -> None:
        """Receive and handle WebSocket text messages (currently only ping)."""
        while True:
            try:
                raw = await asyncio.wait_for(
                    websocket.receive_text(), timeout=90
                )
            except TimeoutError:
                break

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "ping":
                try:
                    await websocket.send_text('{"type":"pong"}')
                except Exception:
                    break

    @classmethod
    async def handle_connection(
        cls, websocket: WebSocket, redis: AsyncRedis
    ) -> None:
        """Run the full WebSocket lifecycle for one connection."""
        try:
            await redis.incr(VISITOR_COUNT_KEY)
            count = await redis.get(VISITOR_COUNT_KEY)
            current = int(count) if count else 0
            await websocket.send_text(
                json.dumps({"type": "count", "count": current})
            )
            await cls.publish_count(redis)

            # Run the two listeners concurrently; either exiting tears down
            # the whole connection.
            await asyncio.gather(
                cls._redis_listener(redis, websocket),
                cls._ws_receiver(websocket),
            )
        except WebSocketDisconnect, Exception:
            logger.debug("WebSocket connection closed")
        finally:
            try:
                await redis.decr(VISITOR_COUNT_KEY)
                await cls.publish_count(redis)
            except Exception:
                logger.warning("Failed to update visitor count on disconnect")
