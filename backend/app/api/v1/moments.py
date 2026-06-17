from fastapi import APIRouter, Depends, Query, status

from app.api.des.auth import get_admin_user
from app.api.des.des import moment_service_dep
from app.core.response import APIResponse
from app.models.models import User
from app.models.moment import MomentStatus
from app.schemas.moment import MomentCreate, MomentUpdate
from app.services.moment_service import MomentService

router = APIRouter(prefix="/moments", tags=["moments"])


@router.get("")
async def list_public_moments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tag: str | None = Query(default=None, max_length=50),
    service: MomentService = Depends(moment_service_dep),
) -> APIResponse:
    data = await service.list_public_moments(
        page=page,
        page_size=page_size,
        tag=tag,
    )
    return APIResponse(data=data, message="Moments retrieved successfully")


@router.get("/admin")
async def list_admin_moments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    moment_status: MomentStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_admin_user),
    service: MomentService = Depends(moment_service_dep),
) -> APIResponse:
    data = await service.list_admin_moments(
        page=page,
        page_size=page_size,
        status=moment_status,
    )
    return APIResponse(data=data, message="Moments retrieved successfully")


@router.get("/{moment_id}")
async def get_public_moment(
    moment_id: str,
    service: MomentService = Depends(moment_service_dep),
) -> APIResponse:
    moment = await service.get_public_moment(moment_id)
    return APIResponse(data={"moment": moment})


@router.get("/admin/{moment_id}")
async def get_admin_moment(
    moment_id: str,
    current_user: User = Depends(get_admin_user),
    service: MomentService = Depends(moment_service_dep),
) -> APIResponse:
    moment = await service.get_admin_moment(moment_id)
    return APIResponse(data={"moment": moment})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_moment(
    data: MomentCreate,
    current_user: User = Depends(get_admin_user),
    service: MomentService = Depends(moment_service_dep),
) -> APIResponse:
    moment = await service.create_moment(user_id=current_user.id, data=data)
    return APIResponse(data={"moment": moment}, message="Moment created")


@router.patch("/{moment_id}")
async def update_moment(
    moment_id: str,
    data: MomentUpdate,
    current_user: User = Depends(get_admin_user),
    service: MomentService = Depends(moment_service_dep),
) -> APIResponse:
    moment = await service.update_moment(moment_id=moment_id, data=data)
    return APIResponse(data={"moment": moment}, message="Moment updated")


@router.delete("/{moment_id}")
async def delete_moment(
    moment_id: str,
    current_user: User = Depends(get_admin_user),
    service: MomentService = Depends(moment_service_dep),
) -> APIResponse:
    await service.delete_moment(moment_id)
    return APIResponse(message="Moment deleted")
