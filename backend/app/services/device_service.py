from app.repositories.device_repo import DeviceRepo


class DeviceService:
    def __init__(self, repo: DeviceRepo):
        self.repo = repo

    async def get_device_by_id(self, device_id: int):
        return await self.repo.get_device_track_by_id(device_id)

    async def get_user_devices(self, user_id: int):
        return await self.repo.get_device_tracks_by_user_id(user_id)

    async def create_device(self, user_id: int, **data: str):
        return await self.repo.create_device_track(user_id, **data)

    async def update_device(self, device_id: int, **data: str):
        return await self.repo.update_device_track(device_id, **data)

    async def delete_device(self, device_id: int) -> bool:
        return await self.repo.delete_device_track_by_id(track_id=device_id)
