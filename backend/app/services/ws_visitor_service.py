"""WebSocket 访客计数服务。

封装连接生命周期、单连接 Redis pub/sub 和计数广播，让 API 层保持轻薄。

每个连接独立订阅共享的 Redis pub/sub 频道 —— 无进程绑定状态，
因此可以水平扩展到多个 uvicorn worker。

用法
----
    redis: AsyncRedis = websocket.app.state.redis
    await WsVisitorService.handle_connection(websocket, redis)

连接时 visitor_id 加入 visitors 集合，断开时引用计数归零后从
集合移除，每次变动通过 Redis pub/sub 广播给所有在线客户端。
"""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager, suppress
from typing import TYPE_CHECKING

from fastapi import WebSocket, WebSocketDisconnect

from app.core import logger

if TYPE_CHECKING:
    from redis.asyncio import Redis as AsyncRedis

VISITOR_COUNT_CHANNEL = "ws:visitor_count_changed"
VISITOR_SET_KEY = "visitors"
VISITOR_CONN_HASH_KEY = "visitor:conns"


@asynccontextmanager
async def redis_pubsub(redis: AsyncRedis):
    """访客计数频道的订阅上下文管理器。

    进入时订阅 ``VISITOR_COUNT_CHANNEL``，退出时（正常或异常）取消订阅
    并通过 ``reset()`` 把连接归还连接池 —— 不关闭底层 TCP 连接，便于复用。
    """
    pubsub = redis.pubsub()
    try:
        await pubsub.subscribe(VISITOR_COUNT_CHANNEL)
        yield pubsub
    finally:
        with suppress(Exception):
            await pubsub.unsubscribe(VISITOR_COUNT_CHANNEL)
            await pubsub.reset()


class WsVisitorService:
    """单连接粒度的 WebSocket 访客管理。

    每次 ``handle_connection`` 调用会并发启动两个任务：

    * ``_redis_listener`` —— 监听 Redis pub/sub，广播计数变化给客户端
    * ``_ws_receiver`` —— 接收 WebSocket 消息（visitor_id + ping/pong）

    访客 ID 通过 Redis Set + Hash 维护连接引用计数，同一用户打开
    多个标签页时，所有连接断开后才会从集合中移除。
    访客总数 = SCARD visitors。
    """

    _visitors: dict[int, str | None] = {}  # noqa: RUF012

    @classmethod
    async def publish_count(cls, redis: AsyncRedis) -> None:
        """从 visitors 集合读取当前唯一访客数并发布到 pub/sub 频道。"""
        current = await redis.scard(VISITOR_SET_KEY)  # pyright: ignore[reportGeneralTypeIssues]
        await redis.publish(
            VISITOR_COUNT_CHANNEL,
            json.dumps({"type": "count", "count": current}),
        )

    @classmethod
    async def _redis_listener(
        cls, redis: AsyncRedis, websocket: WebSocket
    ) -> None:
        """订阅访客计数 pub/sub 频道，逐条转发给 WebSocket 客户端。

        持续运行直到客户端断开（``send_text`` 抛异常）或被 ``handle_connection`` 取消。
        """
        try:
            async with redis_pubsub(redis) as pubsub:
                async for msg in pubsub.listen():
                    if msg["type"] != "message":
                        continue
                    data = msg["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                    try:
                        await websocket.send_text(data)
                    except Exception:
                        break
        except asyncio.CancelledError:
            pass

    @classmethod
    async def _add_visitor(cls, redis: AsyncRedis, visitor_id: str) -> None:
        """记录访客连接。SADD 确保集合存在，HINCRBY 维护连接计数。"""
        pipe = redis.pipeline()
        pipe.sadd(VISITOR_SET_KEY, visitor_id)
        pipe.hincrby(VISITOR_CONN_HASH_KEY, visitor_id, 1)
        await pipe.execute()

    @classmethod
    async def _remove_visitor(cls, redis: AsyncRedis, visitor_id: str) -> None:
        """减少访客连接计数，归零时从集合移除。"""
        remaining = await redis.hincrby(VISITOR_CONN_HASH_KEY, visitor_id, -1)  # pyright: ignore[reportGeneralTypeIssues]
        if remaining <= 0:
            pipe = redis.pipeline()
            pipe.hdel(VISITOR_CONN_HASH_KEY, visitor_id)
            pipe.srem(VISITOR_SET_KEY, visitor_id)
            await pipe.execute()

    @classmethod
    async def _ws_receiver(
        cls, redis: AsyncRedis, websocket: WebSocket
    ) -> None:
        """接收 WebSocket 消息：首条预期为 visitor_id，后续处理 ping/pong。"""
        try:
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=10)
            msg = json.loads(raw)
            if msg.get("type") == "visitor_id":
                visitor_id = msg.get("visitor_id")
                if visitor_id:
                    # 写入 _visitors 必须在 _add_visitor 之前，确保取消时 finally 能清理
                    cls._visitors[id(websocket)] = visitor_id
                    await cls._add_visitor(redis, visitor_id)
                    await cls.publish_count(redis)
        except Exception:
            logger.warning("Failed to register visitor")

        while True:
            try:
                raw = await asyncio.wait_for(
                    websocket.receive_text(), timeout=90
                )
            except (TimeoutError, WebSocketDisconnect):
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
        """管理单条 WebSocket 连接的完整生命周期。

        * 并发启动 ``_redis_listener`` 和 ``_ws_receiver``，
          任一任务结束后立即取消另一个（谁先结束谁就代表连接已断开）
        * ``_ws_receiver`` 收到 visitor_id 后将其加入 visitors 集合并广播计数
        * finally 中清理 visitor 引用计数并广播更新
        """
        try:
            listener_task = asyncio.create_task(
                cls._redis_listener(redis, websocket)
            )
            receiver_task = asyncio.create_task(
                cls._ws_receiver(redis, websocket)
            )
            done, pending = await asyncio.wait(
                [listener_task, receiver_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task
            for task in done:
                exc = task.exception()
                if exc and not isinstance(exc, asyncio.CancelledError):
                    logger.warning(f"Listener task failed: {exc}")
        except WebSocketDisconnect:
            logger.debug("WebSocket disconnected by client")
        except Exception:
            logger.warning("Unexpected WebSocket error")
        finally:
            visitor_id = cls._visitors.pop(id(websocket), None)
            if visitor_id:
                try:
                    await cls._remove_visitor(redis, visitor_id)
                except Exception:
                    logger.warning("Failed to remove visitor")
                try:
                    await cls.publish_count(redis)
                except Exception:
                    logger.warning("Failed to broadcast count after disconnect")
