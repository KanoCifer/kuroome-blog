from collections.abc import Sequence

from fastapi import APIRouter, Depends

from app.api.des.auth import manager
from app.api.des.des import device_service_dep
from app.models.models import DeviceTrack, User
from app.schemas.device import DeviceInput, DeviceResponse, DeviceUpdateInput
from app.schemas.response import APIResponse
from app.services.device_service import DeviceService

router = APIRouter(
    prefix="/device",
    tags=["device"],
)


@router.get("")
async def get_user_devices(
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """获取用户的设备列表"""
    devices: Sequence[DeviceTrack] = await service.get_user_devices(user.id)
    response: list[DeviceResponse] = [
        DeviceResponse.model_validate(device) for device in devices
    ]
    return APIResponse.ok(
        data={"devices": response}, message="获取设备列表成功"
    )


@router.get("/{device_id}")
async def get_device_by_id(
    device_id: int,
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """根据设备ID获取设备信息"""
    device: DeviceTrack | None = await service.get_device_by_id(device_id)
    if not device or device.user_id != user.id:
        return APIResponse.error(message="设备不存在或无权限访问")
    response: DeviceResponse = DeviceResponse.model_validate(device)
    return APIResponse.ok(
        data={"device": response}, message="获取设备信息成功"
    )


@router.post("")
async def create_device(
    device_input: DeviceInput,
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """创建新设备"""
    device: DeviceTrack = await service.create_device(
        user.id, **device_input.model_dump()
    )
    response: DeviceResponse = DeviceResponse.model_validate(device)
    return APIResponse.ok(data={"device": response}, message="创建设备成功")


@router.put("/{device_id}")
async def update_device(
    device_id: int,
    device_input: DeviceUpdateInput,
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """更新设备信息"""
    device: DeviceTrack | None = await service.get_device_by_id(device_id)
    if not device or device.user_id != user.id:
        return APIResponse.error(message="设备不存在或无权限访问")
    updated_device: DeviceTrack | None = await service.update_device(
        device_id, **device_input.model_dump(exclude_unset=True)
    )

    if not updated_device:
        return APIResponse.error(message="设备信息不存在或更新失败")
    response: DeviceResponse = DeviceResponse.model_validate(updated_device)
    return APIResponse.ok(
        data={"device": response}, message="更新设备信息成功"
    )


@router.delete("/{device_id}")
async def delete_device(
    device_id: int,
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """删除设备"""
    device: DeviceTrack | None = await service.get_device_by_id(device_id)
    if not device or device.user_id != user.id:
        return APIResponse.error(message="设备不存在或无权限访问")
    deleted: bool = await service.delete_device(device_id)
    if not deleted:
        return APIResponse.error(message="设备信息不存在或删除失败")
    return APIResponse.ok(message="删除设备成功")


@router.delete("")
async def delete_all_devices(
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """删除用户的所有设备"""
    await service.repo.delete_device_tracks_by_user_id(user.id)
    return APIResponse.ok(message="删除所有设备成功")
