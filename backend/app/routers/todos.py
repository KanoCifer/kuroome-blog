from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

import orjson
from fastapi import APIRouter, Depends, status
from redis.asyncio import Redis as AsyncRedis

from app.dependencies.auth import manager
from app.dependencies.redis import get_async_redis
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import TodoIn, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])

_LOCK_TTL = 5


async def _read_todos(redis: AsyncRedis, key: str) -> list[dict]:
    val = await redis.get(key)
    if not val:
        return []
    try:
        return orjson.loads(val)
    except Exception:
        return []


async def _write_todos(redis: AsyncRedis, key: str, todos: list[dict]) -> None:
    await redis.set(key, orjson.dumps(todos).decode())


async def _acquire_lock(
    redis: AsyncRedis, lock_key: str, retries: int = 8, delay_ms: int = 50
) -> bool:
    for _ in range(retries):
        ok = await redis.set(lock_key, "1", ex=_LOCK_TTL, nx=True)
        if ok:
            return True
        await asyncio.sleep(delay_ms / 1000)
    return False


async def _release_lock(redis: AsyncRedis, lock_key: str) -> None:
    await redis.delete(lock_key)


@router.get("")
async def get_todos(
    user: User = Depends(manager), redis: AsyncRedis = Depends(get_async_redis)
):
    """Get current user's todos."""
    key = f"todos:{user.id}"
    todos = await _read_todos(redis, key)
    return APIResponse.ok(data={"todos": todos})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_todo(
    data: TodoIn,
    user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """Create a new todo for current user."""
    key = f"todos:{user.id}"
    lock_key = f"todos:lock:{user.id}"
    if not await _acquire_lock(redis, lock_key):
        return APIResponse.error(
            message="Server busy, please retry.", code=status.HTTP_423_LOCKED
        )
    try:
        todos = await _read_todos(redis, key)
        todo_id = data.id or uuid.uuid4().hex
        created_at = datetime.now(timezone.utc).isoformat()  # noqa: UP017
        todo = {
            "id": todo_id,
            "text": data.text,
            "completed": bool(data.completed),
            "createdAt": created_at,
            "description": data.description,
            "dueDate": data.dueDate,
            "priority": data.priority or "medium",
            "category": data.category,
        }
        todos.insert(0, todo)
        await _write_todos(redis, key, todos)
    finally:
        await _release_lock(redis, lock_key)

    return APIResponse.ok(
        data={"todo": todo},
        message="Todo created",
        code=status.HTTP_201_CREATED,
    )


@router.patch("/{todo_id}")
async def patch_todo(
    todo_id: str,
    data: TodoUpdate,
    user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """Partial update of a todo."""
    key = f"todos:{user.id}"
    lock_key = f"todos:lock:{user.id}"
    if not await _acquire_lock(redis, lock_key):
        return APIResponse.error(
            message="Server busy, please retry.", code=status.HTTP_423_LOCKED
        )
    updated = None
    try:
        todos = await _read_todos(redis, key)
        for i, t in enumerate(todos):
            if t.get("id") == todo_id:
                if data.text is not None:
                    t["text"] = data.text
                if data.description is not None:
                    t["description"] = data.description
                if data.dueDate is not None:
                    t["dueDate"] = data.dueDate
                if data.priority is not None:
                    t["priority"] = data.priority
                if data.category is not None:
                    t["category"] = data.category
                if data.completed is not None:
                    t["completed"] = bool(data.completed)
                todos[i] = t
                updated = t
                break
        if updated is None:
            return APIResponse.error(
                message="Todo not found", code=status.HTTP_404_NOT_FOUND
            )
        await _write_todos(redis, key, todos)
    finally:
        await _release_lock(redis, lock_key)

    return APIResponse.ok(data={"todo": updated}, message="Todo updated")


@router.put("/{todo_id}")
async def replace_todo(
    todo_id: str,
    data: TodoIn,
    user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """Replace a todo (full update)."""
    key = f"todos:{user.id}"
    lock_key = f"todos:lock:{user.id}"
    if not await _acquire_lock(redis, lock_key):
        return APIResponse.error(
            message="Server busy, please retry.", code=status.HTTP_423_LOCKED
        )
    updated = None
    try:
        todos = await _read_todos(redis, key)
        for i, t in enumerate(todos):
            if t.get("id") == todo_id:
                updated = {
                    "id": todo_id,
                    "text": data.text,
                    "completed": bool(data.completed),
                    "createdAt": t.get("createdAt")
                    or datetime.now(timezone.utc).isoformat(),  # noqa: UP017
                    "description": data.description,
                    "dueDate": data.dueDate,
                    "priority": data.priority or "medium",
                    "category": data.category,
                }
                todos[i] = updated
                break
        if updated is None:
            return APIResponse.error(
                message="Todo not found", code=status.HTTP_404_NOT_FOUND
            )
        await _write_todos(redis, key, todos)
    finally:
        await _release_lock(redis, lock_key)

    return APIResponse.ok(data={"todo": updated}, message="Todo replaced")


@router.delete("/{todo_id}")
async def delete_todo(
    todo_id: str,
    user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """Delete a todo."""
    key = f"todos:{user.id}"
    lock_key = f"todos:lock:{user.id}"
    if not await _acquire_lock(redis, lock_key):
        return APIResponse.error(
            message="Server busy, please retry.", code=status.HTTP_423_LOCKED
        )
    try:
        todos = await _read_todos(redis, key)
        new_list = [t for t in todos if t.get("id") != todo_id]
        if len(new_list) == len(todos):
            return APIResponse.error(
                message="Todo not found", code=status.HTTP_404_NOT_FOUND
            )
        await _write_todos(redis, key, new_list)
    finally:
        await _release_lock(redis, lock_key)

    return APIResponse.ok(message="Todo deleted")


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_todos(
    data: list[TodoIn],
    user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """Import a list of todos (merge at front). For migrating localStorage todos."""
    key = f"todos:{user.id}"
    lock_key = f"todos:lock:{user.id}"
    if not await _acquire_lock(redis, lock_key):
        return APIResponse.error(
            message="Server busy, please retry.", code=status.HTTP_423_LOCKED
        )
    try:
        existing = await _read_todos(redis, key)
        new_items = []
        for item in data:
            todo_id = item.id or uuid.uuid4().hex
            created_at = datetime.now(timezone.utc).isoformat()  # noqa: UP017
            new_items.append(
                {
                    "id": todo_id,
                    "text": item.text,
                    "completed": bool(item.completed),
                    "createdAt": created_at,
                    "description": item.description,
                    "dueDate": item.dueDate,
                    "priority": item.priority or "medium",
                    "category": item.category,
                }
            )
        merged = new_items + existing
        await _write_todos(redis, key, merged)
    finally:
        await _release_lock(redis, lock_key)

    return APIResponse.ok(message="Todos imported")


@router.post("/clear-completed")
async def clear_completed(
    user: User = Depends(manager), redis: AsyncRedis = Depends(get_async_redis)
):
    """Remove all completed todos for current user."""
    key = f"todos:{user.id}"
    lock_key = f"todos:lock:{user.id}"
    if not await _acquire_lock(redis, lock_key):
        return APIResponse.error(
            message="Server busy, please retry.", code=status.HTTP_423_LOCKED
        )
    try:
        todos = await _read_todos(redis, key)
        remaining = [t for t in todos if not t.get("completed")]
        await _write_todos(redis, key, remaining)
    finally:
        await _release_lock(redis, lock_key)

    return APIResponse.ok(message="Cleared completed todos")
