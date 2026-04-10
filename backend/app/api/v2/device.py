from collections.abc import Sequence

from fastapi import APIRouter, Depends

from app.api.des.auth import manager
from app.api.des.des import device_service_dep
from app.models.models import DeviceTrack, User
from app.schemas.device import (
    DeviceInput,
    DeviceResponse,
    DeviceStatusUpdate,
    DeviceUpdateInput,
    ReminderConfigUpdate,
)
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


@router.patch("/{device_id}/status")
async def update_device_status(
    device_id: int,
    status_update: DeviceStatusUpdate,
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """更新设备状态（active/retired）"""
    device: DeviceTrack | None = await service.get_device_by_id(device_id)
    if not device or device.user_id != user.id:
        return APIResponse.error(message="设备不存在或无权限访问")
    updated_device: DeviceTrack | None = await service.update_device_status(
        device_id, status=status_update.status
    )
    if not updated_device:
        return APIResponse.error(message="设备状态更新失败")
    response: DeviceResponse = DeviceResponse.model_validate(updated_device)
    return APIResponse.ok(
        data={"device": response}, message="更新设备状态成功"
    )


@router.patch("/{device_id}/reminders")
async def update_device_reminders(
    device_id: int,
    reminder_update: ReminderConfigUpdate,
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """更新设备提醒配置"""
    device: DeviceTrack | None = await service.get_device_by_id(device_id)
    if not device or device.user_id != user.id:
        return APIResponse.error(message="设备不存在或无权限访问")
    updated_device: (
        DeviceTrack | None
    ) = await service.update_device_reminder_config(
        device_id, reminder_config=reminder_update.reminder_config
    )
    if not updated_device:
        return APIResponse.error(message="提醒配置更新失败")
    response: DeviceResponse = DeviceResponse.model_validate(updated_device)
    return APIResponse.ok(
        data={"device": response}, message="更新提醒配置成功"
    )


@router.get("/upcoming")
async def get_upcoming_devices(
    days_ahead: int = 30,
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """获取即将到达里程碑的设备"""
    devices: Sequence[
        DeviceTrack
    ] = await service.get_upcoming_milestone_devices(user.id, days_ahead)
    response: list[DeviceResponse] = [
        DeviceResponse.model_validate(device) for device in devices
    ]
    return APIResponse.ok(
        data={"devices": response}, message="获取即将到达里程碑的设备成功"
    )


@router.post("/{device_id}/test-notification")
async def test_device_notification(
    device_id: int,
    user: User = Depends(manager),
    service: DeviceService = Depends(device_service_dep),
):
    """测试通知发送"""
    device: DeviceTrack | None = await service.get_device_by_id(device_id)
    if not device or device.user_id != user.id:
        return APIResponse.error(message="设备不存在或无权限访问")

    from datetime import UTC, datetime

    from app.notification import DeviceNotificationPayload
    from app.notification.dispatcher import NotificationDispatcher

    # 构建测试通知
    days_owned = (datetime.now(UTC).date() - device.purchase_date.date()).days
    payload = DeviceNotificationPayload(
        title=f"测试通知 - {device.name}",
        body=f"这是一条测试通知，设备已使用 {days_owned} 天",
        name=device.name,
        price=device.price,
        currency=device.currency,
        purchase_date=device.purchase_date,
    )

    reminder_config = device.reminder_config or {}
    channels = reminder_config.get("channels", ["email"])

    dispatcher = NotificationDispatcher()
    results = await dispatcher.dispatch_device_reminder(
        payload=payload,
        reminder_config=reminder_config,
        user_id=user.id,
        channels=channels,
    )

    return APIResponse.ok(
        data={"results": results}, message="测试通知发送完成"
    )
