from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from redis.asyncio import Redis as AsyncRedis

from app.api.des.auth import manager
from app.api.des.redis import get_redis
from app.models.models import User
from app.repositories.todo_repo import TodoRepo
from app.schemas.response import APIResponse
from app.schemas.schemas import TodoIn, TodoUpdate
from app.services.todo_service import TodoService

router = APIRouter(prefix="/todos", tags=["todos"])


# ----依赖注入----
def get_todo_service(
    redis: AsyncRedis = Depends(get_redis),
) -> TodoService:
    return TodoService(TodoRepo(redis))


# ----API Endpoints----


@router.get("")
async def get_todos(
    include_archived: bool = Query(False),
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Get current user's todos. Excludes archived by default."""
    todos = await todo_service.get_todos(user.id, include_archived)
    return APIResponse.ok(data={"todos": todos})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_todo(
    data: TodoIn,
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Create a new todo for current user."""
    try:
        todo = await todo_service.create_todo(
            user_id=user.id, todo_data=data.model_dump()
        )
    except Exception as e:
        if "无法获取锁" in str(e):
            return APIResponse.error(
                message="Server busy, please retry.",
                code=status.HTTP_423_LOCKED,
            )
        raise

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
    todo_service: TodoService = Depends(get_todo_service),
) -> JSONResponse:
    """Partial update of a todo."""
    updated = None
    try:
        updated = await todo_service.patch_todo(
            user_id=user.id,
            todo_id=todo_id,
            update_data=data.model_dump(exclude_unset=True),
        )
    except Exception as e:
        if "无法获取锁" in str(e):
            return APIResponse.error(
                message="Server busy, please retry.",
                code=status.HTTP_423_LOCKED,
            )
        raise

    return APIResponse.ok(data={"todo": updated}, message="Todo updated")


@router.put("/{todo_id}")
async def replace_todo(
    todo_id: str,
    data: TodoIn,
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Replace a todo (full update)."""
    updated = None
    try:
        updated = await todo_service.replace_todo(
            user_id=user.id, todo_id=todo_id, new_data=data.model_dump()
        )
        if updated is None:
            return APIResponse.error(
                message="Todo not found", code=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        if "无法获取锁" in str(e):
            return APIResponse.error(
                message="Server busy, please retry.",
                code=status.HTTP_423_LOCKED,
            )
        raise

    return APIResponse.ok(data={"todo": updated}, message="Todo replaced")


@router.delete("/{todo_id}")
async def delete_todo(
    todo_id: str,
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Delete a todo."""
    try:
        deleted = await todo_service.delete_todo(user.id, todo_id)
    except Exception as e:
        if "无法获取锁" in str(e):
            return APIResponse.error(
                message="Server busy, please retry.",
                code=status.HTTP_423_LOCKED,
            )
        raise

    return APIResponse.ok(data={"todo": deleted}, message="Todo deleted")


@router.get("/archived")
async def get_archived_todos(
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Get all archived todos for current user."""
    return APIResponse.ok(
        data={"todos": await todo_service.get_archived_todos(user.id)}
    )


@router.post("/{todo_id}/archive")
async def archive_todo(
    todo_id: str,
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Archive a todo."""
    updated = None
    try:
        updated = await todo_service.archive_todo(user.id, todo_id)
    except Exception as e:
        if "无法获取锁" in str(e):
            return APIResponse.error(
                message="Server busy, please retry.",
                code=status.HTTP_423_LOCKED,
            )
        raise

    return APIResponse.ok(data={"todo": updated}, message="Todo archived")


@router.post("/{todo_id}/unarchive")
async def unarchive_todo(
    todo_id: str,
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Unarchive a todo."""
    updated = None
    try:
        updated = await todo_service.unarchive_todo(user.id, todo_id)
    except Exception as e:
        if "无法获取锁" in str(e):
            return APIResponse.error(
                message="Server busy, please retry.",
                code=status.HTTP_423_LOCKED,
            )
        raise

    return APIResponse.ok(data={"todo": updated}, message="Todo unarchived")


@router.post("/archive-completed")
async def archive_completed(
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Archive all completed (non-archived) todos."""
    try:
        count = await todo_service.archive_completed(user.id)
    except Exception as e:
        if "无法获取锁" in str(e):
            return APIResponse.error(
                message="Server busy, please retry.",
                code=status.HTTP_423_LOCKED,
            )
        raise

    return APIResponse.ok(message=f"Archived {count} completed todos")


@router.post("/clear-completed")
async def clear_completed(
    user: User = Depends(manager),
    todo_service: TodoService = Depends(get_todo_service),
):
    """Remove all completed todos for current user."""
    try:
        await todo_service.clear_completed(user.id)
    except Exception as e:
        if "无法获取锁" in str(e):
            return APIResponse.error(
                message="Server busy, please retry.",
                code=status.HTTP_423_LOCKED,
            )
        raise

    return APIResponse.ok(message="Cleared completed todos")
