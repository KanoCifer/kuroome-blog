"""WebSocket visitor count service.

Encapsulates connection tracking, Redis pub/sub lifecycle, and count broadcasting
so the API layer is a thin handler.
"""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager, suppress

from fastapi import WebSocket, WebSocketDisconnect
from redis.asyncio import Redis as AsyncRedis

from app.core import logger

VISITOR_COUNT_KEY = "ws:visitor_count"
VISITOR_COUNT_CHANNEL = "ws:visitor_count_changed"


class WsVisitorService:
    """Process-wide WebSocket visitor count manager.

    Tracks active connections and manages a single Redis pub/sub listener
    that broadcasts count changes to all connected clients.
    """

    _active_connections: dict[WebSocket, dict] = {}  # noqa: RUF012
    _listener_started = False
    _listener_lock = asyncio.Lock()

    @classmethod
    async def _broadcast(cls, message: str) -> None:
        stale: list[WebSocket] = []
        for ws in cls._active_connections:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            cls._active_connections.pop(ws, None)

    @classmethod
    async def _subscriber(cls, redis: AsyncRedis) -> None:
        pubsub = redis.pubsub()
        await pubsub.subscribe(VISITOR_COUNT_CHANNEL)
        try:
            async for msg in pubsub.listen():
                if msg["type"] == "message":
                    data = msg["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    await cls._broadcast(data)
        except asyncio.CancelledError:
            await pubsub.unsubscribe(VISITOR_COUNT_CHANNEL)
            raise

    @classmethod
    @asynccontextmanager
    async def ensure_listener(cls, redis: AsyncRedis):
        """Ensure exactly one pub/sub listener runs process-wide."""
        task = None
        async with cls._listener_lock:
            if not cls._listener_started:
                cls._listener_started = True
                task = asyncio.create_task(cls._subscriber(redis))
        try:
            yield
        finally:
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task
                cls._listener_started = False

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
    async def _handle_message(cls, websocket: WebSocket, raw: str) -> None:
        """Parse and dispatch an incoming JSON message."""
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            return

        msg_type = msg.get("type")

        if msg_type == "ping":
            await websocket.send_text('{"type":"pong"}')
        elif msg_type == "visitor_id":
            visitor_id = msg.get("visitor_id")
            if visitor_id is not None:
                cls._active_connections[websocket] = {"visitor_id": visitor_id}

    @classmethod
    async def handle_connection(
        cls, websocket: WebSocket, redis: AsyncRedis
    ) -> None:
        """Run the full WebSocket lifecycle for one connection."""
        async with cls.ensure_listener(redis):
            cls._active_connections[websocket] = {}

            try:
                await redis.incr(VISITOR_COUNT_KEY)
                # 给当前连接直接推送初始 count，避免 pub/sub listener 未就绪的竞态
                count = await redis.get(VISITOR_COUNT_KEY)
                current = int(count) if count else 0
                await websocket.send_text(
                    json.dumps({"type": "count", "count": current})
                )
                await cls.publish_count(redis)

                while True:
                    try:
                        raw = await asyncio.wait_for(
                            websocket.receive_text(), timeout=90
                        )
                    except TimeoutError:
                        break

                    await cls._handle_message(websocket, raw)
            except WebSocketDisconnect:
                pass
            except Exception:
                logger.exception("WebSocket error")
            finally:
                cls._active_connections.pop(websocket, None)
                try:
                    await redis.decr(VISITOR_COUNT_KEY)
                    await cls.publish_count(redis)
                except Exception:
                    logger.warning(
                        "Failed to update visitor count on disconnect"
                    )
