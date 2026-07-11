from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.des.appstate import get_app_state
from app.api.des.auth import get_admin_user
from app.api.des.db import get_session
from app.appstate import AppState
from app.core.response import APIResponse
from app.models.models import User
from app.models.moment import MomentStatus
from app.schemas.moment import MomentCreate, MomentUpdate

router = APIRouter(prefix="/moments", tags=["moments"])


@router.get("")
async def list_public_moments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tag: str | None = Query(default=None, max_length=50),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    data = await state.moment_svc.list_public_moments(
        session,
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
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    data = await state.moment_svc.list_admin_moments(
        session,
        page=page,
        page_size=page_size,
        status=moment_status,
    )
    return APIResponse(data=data, message="Moments retrieved successfully")


@router.get("/{moment_id}")
async def get_public_moment(
    moment_id: str,
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    moment = await state.moment_svc.get_public_moment(session, moment_id)
    return APIResponse(data={"moment": moment})


@router.get("/admin/{moment_id}")
async def get_admin_moment(
    moment_id: str,
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    moment = await state.moment_svc.get_admin_moment(session, moment_id)
    return APIResponse(data={"moment": moment})


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_moment(
    data: MomentCreate,
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    moment = await state.moment_svc.create_moment(
        session, user_id=current_user.id, data=data
    )
    return APIResponse(data={"moment": moment}, message="Moment created")


@router.patch("/{moment_id}")
async def update_moment(
    moment_id: str,
    data: MomentUpdate,
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    moment = await state.moment_svc.update_moment(
        session, moment_id=moment_id, data=data
    )
    return APIResponse(data={"moment": moment}, message="Moment updated")


@router.delete("/{moment_id}")
async def delete_moment(
    moment_id: str,
    current_user: User = Depends(get_admin_user),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    await state.moment_svc.delete_moment(session, moment_id)
    return APIResponse(message="Moment deleted")
