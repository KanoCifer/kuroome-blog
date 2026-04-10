from collections.abc import Sequence

from app.models.models import DeviceTrack
from app.repositories.device_repo import DeviceRepo


class DeviceService:
    def __init__(self, repo: DeviceRepo):
        self.repo = repo

    async def get_device_by_id(self, device_id: int) -> DeviceTrack | None:
        return await self.repo.get_device_track_by_id(device_id)

    async def get_user_devices(self, user_id: int) -> Sequence[DeviceTrack]:
        return await self.repo.get_device_tracks_by_user_id(user_id)

    async def create_device(self, user_id: int, **data: str) -> DeviceTrack:
        return await self.repo.create_device_track(user_id, **data)

    async def update_device(
        self, device_id: int, **data: str
    ) -> DeviceTrack | None:
        return await self.repo.update_device_track(device_id, **data)

    async def delete_device(self, device_id: int) -> bool:
        return await self.repo.delete_device_track_by_id(track_id=device_id)

    async def update_device_status(
        self, device_id: int, status: str
    ) -> DeviceTrack | None:
        """更新设备状态"""
        return await self.repo.update_device_track(device_id, status=status)

    async def update_device_reminder_config(
        self, device_id: int, reminder_config: dict
    ) -> DeviceTrack | None:
        """更新设备提醒配置"""
        return await self.repo.update_device_track(
            device_id, reminder_config=reminder_config
        )

    async def get_upcoming_milestone_devices(
        self, user_id: int, days_ahead: int = 30
    ) -> Sequence[DeviceTrack]:
        """获取即将到达里程碑的设备"""
        return await self.repo.get_devices_with_upcoming_milestone(
            user_id=user_id, days_ahead=days_ahead
        )
