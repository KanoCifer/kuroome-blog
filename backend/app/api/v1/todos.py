from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from app.api.des.auth import manager
from app.api.des.des import todo_service_dep
from app.core.exceptions import TodoLockError
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import BatchAction, TodoCreate, TodoUpdate
from app.services.todo_service import TodoService

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("")
async def get_todos(
    include_archived: bool = Query(False),
    user: User = Depends(manager),
    todo_service: TodoService = Depends(todo_service_dep),
) -> JSONResponse:
    todos = await todo_service.get_todos(user.id, include_archived)
    return APIResponse.ok(data={"todos": todos})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_todo(
    data: TodoCreate,
    user: User = Depends(manager),
    todo_service: TodoService = Depends(todo_service_dep),
) -> JSONResponse:
    try:
        todo = await todo_service.create_todo(
            user_id=user.id, todo_data=data.model_dump()
        )
    except TodoLockError:
        return APIResponse.error(
            message="Server busy, please retry.",
            code=status.HTTP_423_LOCKED,
        )

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
    todo_service: TodoService = Depends(todo_service_dep),
) -> JSONResponse:
    try:
        updated = await todo_service.patch_todo(
            user_id=user.id,
            todo_id=todo_id,
            update_data=data.model_dump(exclude_unset=True),
        )
    except TodoLockError:
        return APIResponse.error(
            message="Server busy, please retry.",
            code=status.HTTP_423_LOCKED,
        )

    return APIResponse.ok(data={"todo": updated}, message="Todo updated")


@router.delete("/{todo_id}")
async def delete_todo(
    todo_id: str,
    user: User = Depends(manager),
    todo_service: TodoService = Depends(todo_service_dep),
) -> JSONResponse:
    try:
        deleted = await todo_service.delete_todo(user.id, todo_id)
    except TodoLockError:
        return APIResponse.error(
            message="Server busy, please retry.",
            code=status.HTTP_423_LOCKED,
        )

    return APIResponse.ok(data={"todo": deleted}, message="Todo deleted")


@router.post("/batch")
async def batch_operation(
    data: BatchAction,
    user: User = Depends(manager),
    todo_service: TodoService = Depends(todo_service_dep),
):
    try:
        if data.action == "archiveCompleted":
            count = await todo_service.archive_completed(user.id)
            return APIResponse.ok(message=f"Archived {count} completed todos")
        if data.action == "clearCompleted":
            await todo_service.clear_completed(user.id)
            return APIResponse.ok(message="Cleared completed todos")
    except TodoLockError:
        return APIResponse.error(
            message="Server busy, please retry.",
            code=status.HTTP_423_LOCKED,
        )

    return APIResponse.error(message="Unknown action", code=400)
