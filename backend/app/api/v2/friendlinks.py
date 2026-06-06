from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from app.api.des.auth import get_admin_user
from app.core.container import get_friendlink_service
from app.core.exceptions import APIError
from app.core.response import APIResponse
from app.models.models import User
from app.schemas.friendlink import (
    FriendLinkCreate,
    FriendLinkReorder,
    FriendLinkUpdate,
)

router = APIRouter(prefix="/friend-links", tags=["friend-links"])


def _serialize(link) -> dict:
    d = link.model_dump()
    d["id"] = str(link.id)
    return d


@router.get("")
async def list_links() -> JSONResponse:
    async with get_friendlink_service() as service:
        links = await service.get_links()
    return APIResponse.ok(data={"links": [_serialize(link) for link in links]})


@router.get("/{link_id}")
async def get_link(link_id: str) -> JSONResponse:
    async with get_friendlink_service() as service:
        link = await service.get_link(link_id)
    if not link:
        raise APIError(message="Friend link not found", code=404)
    return APIResponse.ok(data={"link": _serialize(link)})


@router.post("")
async def create_link(
    data: FriendLinkCreate,
    _: User = Depends(get_admin_user),
) -> JSONResponse:
    async with get_friendlink_service() as service:
        link = await service.create_link(data.model_dump())
    return APIResponse.ok(
        data={"link": _serialize(link)},
        message="Friend link created",
        status_code=status.HTTP_201_CREATED,
    )


@router.put("/{link_id}")
async def update_link(
    link_id: str,
    data: FriendLinkUpdate,
    _: User = Depends(get_admin_user),
) -> JSONResponse:
    async with get_friendlink_service() as service:
        try:
            link = await service.update_link(
                link_id, data.model_dump(exclude_unset=True)
            )
            return APIResponse.ok(data={"link": _serialize(link)})
        except ValueError as e:
            raise APIError(message=str(e), code=404) from e


@router.delete("/{link_id}")
async def delete_link(
    link_id: str,
    _: User = Depends(get_admin_user),
) -> JSONResponse:
    async with get_friendlink_service() as service:
        try:
            await service.delete_link(link_id)
            return APIResponse.ok(message="Friend link deleted")
        except ValueError as e:
            raise APIError(message=str(e), code=404) from e


@router.put("/reorder")
async def reorder_links(
    data: FriendLinkReorder,
    _: User = Depends(get_admin_user),
) -> JSONResponse:
    async with get_friendlink_service() as service:
        links = await service.reorder_links(data.ordered_ids)
    return APIResponse.ok(
        data={"links": [_serialize(link) for link in links]},
        message="Friend links reordered",
    )
