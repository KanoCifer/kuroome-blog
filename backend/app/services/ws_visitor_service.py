"""WebSocket visitor count service.

Encapsulates connection tracking, Redis pub/sub lifecycle, and count broadcasting
so the API layer is a thin handler. Also handles authenticated user online tracking
via JWT cookie on connection.
"""

from __future__ import annotations

import asyncio
import json
import time
from contextlib import asynccontextmanager, suppress

from fastapi import WebSocket, WebSocketDisconnect
from redis.asyncio import Redis as AsyncRedis

import jwt
from app.api.des.auth import manager
from app.core import logger

VISITOR_COUNT_KEY = "ws:visitor_count"
VISITOR_COUNT_CHANNEL = "ws:visitor_count_changed"


class WsVisitorService:
    """Process-wide WebSocket visitor count manager.

    Tracks active connections and manages a single Redis pub/sub listener
    that broadcasts count changes to all connected clients.

    When the client's cookie includes a valid JWT access-token, the connection
    is also registered in the ``online:users`` sorted set for authenticated
    user presence.
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
    async def _try_authenticate(cls, websocket: WebSocket):
        """Try to authenticate user from the WebSocket handshake cookie.

        Reads the ``access-token`` cookie (set by fastapi-login), decodes the
        JWT, and loads the corresponding user.  Returns ``None`` when no valid
        token is present.
        """
        cookie_header = websocket.headers.get("cookie", "")
        token: str | None = None
        for part in cookie_header.split("; "):
            if "=" not in part:
                continue
            key, val = part.split("=", 1)
            if key.strip() == "access-token":
                token = val.strip()
                break

        if not token:
            return None

        try:
            payload = jwt.decode(
                token,
                manager.secret.secret_for_decode,
                algorithms=[manager.algorithm or "HS256"],
            )
        except jwt.PyJWTError:
            return None

        user_id = payload.get("sub")
        if user_id is None:
            return None

        return await manager._load_user(user_id)

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
                cls._active_connections[websocket].update(
                    {"visitor_id": visitor_id}
                )

    @classmethod
    async def handle_connection(
        cls, websocket: WebSocket, redis: AsyncRedis
    ) -> None:
        """Run the full WebSocket lifecycle for one connection."""
        async with cls.ensure_listener(redis):
            cls._active_connections[websocket] = {}

            # ---- try JWT authentication from cookie ----
            user = await cls._try_authenticate(websocket)
            if user is not None:
                now = int(time.time())
                cls._active_connections[websocket].update(
                    {"visitor_id": None, "user_id": user.id}
                )
                await redis.zadd("online:users", {str(user.id): now})
                await redis.set(f"online:{user.id}", str(now), ex=600)

            try:
                await redis.incr(VISITOR_COUNT_KEY)
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
                conn = cls._active_connections.pop(websocket, None) or {}
                user_id = conn.get("user_id")
                if user_id is not None:
                    try:
                        await redis.zrem("online:users", str(user_id))
                        await redis.delete(f"online:{user_id}")
                    except Exception:
                        logger.warning(
                            "Failed to clean up online tracking on disconnect"
                        )
                try:
                    await redis.decr(VISITOR_COUNT_KEY)
                    await cls.publish_count(redis)
                except Exception:
                    logger.warning(
                        "Failed to update visitor count on disconnect"
                    )
