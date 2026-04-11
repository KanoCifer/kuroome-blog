from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select

from app.api.des.db import AsyncSession
from app.models.models import DeviceTrack


class DeviceRepo:
    def __init__(self, session: AsyncSession):
        self.session: AsyncSession = session

    async def create_device_track(self, user_id: int, **data) -> DeviceTrack:
        """创建设备跟踪记录"""
        purchase_date = data.get("purchase_date")
        if isinstance(purchase_date, str):
            data["purchase_date"] = datetime.fromisoformat(purchase_date)
        device_track = DeviceTrack(user_id=user_id, **data)
        self.session.add(device_track)
        await self.session.flush()
        await self.session.refresh(device_track)
        return device_track

    async def get_device_tracks_by_user_id(
        self, user_id: int
    ) -> Sequence[DeviceTrack]:
        """根据用户ID获取设备跟踪记录列表"""
        stmt = select(DeviceTrack).where(DeviceTrack.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_device_tracks_by_user_id(self, user_id: int) -> None:
        """根据用户ID删除设备跟踪记录"""
        stmt = select(DeviceTrack).where(DeviceTrack.user_id == user_id)
        result = await self.session.execute(stmt)
        device_tracks = result.scalars().all()
        for device_track in device_tracks:
            await self.session.delete(device_track)
        await self.session.flush()

    async def delete_device_track_by_id(self, track_id: int) -> bool:
        """根据跟踪ID删除设备跟踪记录"""
        stmt = select(DeviceTrack).where(DeviceTrack.id == track_id)
        result = await self.session.execute(stmt)
        device_track = result.scalar_one_or_none()
        if device_track:
            await self.session.delete(device_track)
            await self.session.flush()
            return True
        return False

    async def get_device_track_by_id(
        self, track_id: int
    ) -> DeviceTrack | None:
        """根据跟踪ID获取设备跟踪记录"""
        stmt = select(DeviceTrack).where(DeviceTrack.id == track_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_device_track(
        self, track_id: int, **data
    ) -> DeviceTrack | None:
        """更新设备跟踪记录"""
        purchase_date = data.get("purchase_date")
        if isinstance(purchase_date, str):
            data["purchase_date"] = datetime.fromisoformat(purchase_date)
        stmt = select(DeviceTrack).where(DeviceTrack.id == track_id)
        result = await self.session.execute(stmt)
        device_track = result.scalar_one_or_none()
        if device_track:
            for key, value in data.items():
                setattr(device_track, key, value)
            await self.session.flush()
            await self.session.refresh(device_track)
            return device_track
        return None

    async def get_active_devices(self) -> Sequence[DeviceTrack]:
        """获取所有活跃设备"""
        stmt = select(DeviceTrack).where(DeviceTrack.status == "active")
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_devices_with_upcoming_milestone(
        self, user_id: int, days_ahead: int = 30
    ) -> Sequence[DeviceTrack]:
        """获取即将到达里程碑的设备（未来N天内）"""
        from datetime import UTC, timedelta

        today = datetime.now(UTC).date()
        future_date = today + timedelta(days=days_ahead)

        stmt = select(DeviceTrack).where(
            DeviceTrack.user_id == user_id,
            DeviceTrack.status == "active",
        )
        result = await self.session.execute(stmt)
        devices = result.scalars().all()

        # 过滤出即将到达里程碑的设备
        upcoming = []
        for device in devices:
            days_owned = (today - device.purchase_date.date()).days
            future_days = (future_date - device.purchase_date.date()).days

            # 检查是否有里程碑在 [days_owned, future_days] 范围内
            reminder_config = device.reminder_config or {}
            milestones = reminder_config.get(
                "milestones", [100, 365, 730, 1000, 1825]
            )

            for milestone in milestones:
                if days_owned <= milestone <= future_days:
                    upcoming.append(device)
                    break

        return upcoming
