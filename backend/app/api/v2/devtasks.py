from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.api.des.auth import manager
from app.api.des.des import devtask_service_dep
from app.core.exceptions import APIError
from app.core.response import APIResponse
from app.models.models import User
from app.schemas.devtask import DevTaskCreate, DevTaskUpdate
from app.services.devtask_service import DevTaskService

router = APIRouter(prefix="/devtasks", tags=["devtasks"])


class DevTaskReorder(BaseModel):
    status: str
    ordered_ids: list[str]


@router.get("")
async def get_tasks(
    service: DevTaskService = Depends(devtask_service_dep),
) -> APIResponse:
    tasks = await service.get_all_tasks()
    grouped: dict[str, list[dict]] = {
        "todo": [],
        "in-progress": [],
        "done": [],
    }
    for t in tasks:
        td = t.model_dump(mode="json")
        td["id"] = str(t.id)
        grouped[t.status].append(td)
    return APIResponse(data={"tasks": grouped})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_task(
    data: DevTaskCreate,
    user: User = Depends(manager),
    service: DevTaskService = Depends(devtask_service_dep),
) -> APIResponse:
    task = await service.create_task(
        user_id=user.id, task_data=data.model_dump()
    )
    td = task.model_dump()
    td["id"] = str(task.id)
    return APIResponse(
        data={"task": td},
        message="DevTask created",
    )


@router.patch("/{task_id}")
async def patch_task(
    task_id: str,
    data: DevTaskUpdate,
    user: User = Depends(manager),
    service: DevTaskService = Depends(devtask_service_dep),
) -> APIResponse:
    try:
        updated = await service.update_task(
            user_id=user.id,
            task_id=task_id,
            update_data=data.model_dump(exclude_unset=True),
        )
        td = updated.model_dump()
        td["id"] = str(updated.id)
        return APIResponse(data={"task": td}, message="DevTask updated")
    except ValueError as e:
        raise APIError(message=str(e), code=404) from e


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    user: User = Depends(manager),
    service: DevTaskService = Depends(devtask_service_dep),
) -> APIResponse:
    try:
        await service.delete_task(user.id, task_id)
        return APIResponse(message="DevTask deleted")
    except ValueError as e:
        raise APIError(message=str(e), code=404) from e


@router.put("/reorder")
async def reorder_tasks(
    data: DevTaskReorder,
    user: User = Depends(manager),
    service: DevTaskService = Depends(devtask_service_dep),
) -> APIResponse:
    tasks = await service.reorder_tasks(user.id, data.status, data.ordered_ids)
    task_dicts = []
    for t in tasks:
        td = t.model_dump()
        td["id"] = str(t.id)
        task_dicts.append(td)
    return APIResponse(
        data={"tasks": task_dicts},
        message="DevTasks reordered",
    )
