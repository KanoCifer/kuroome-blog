from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import DeviceTrack


class DeviceRepo:
    async def create_device_track(
        self, session: AsyncSession, user_id: int, **data
    ) -> DeviceTrack:
        """创建设备跟踪记录"""
        purchase_date = data.get("purchase_date")
        if isinstance(purchase_date, str):
            data["purchase_date"] = datetime.fromisoformat(purchase_date)
        device_track = DeviceTrack(user_id=user_id, **data)
        session.add(device_track)
        await session.flush()
        await session.refresh(device_track)
        return device_track

    async def get_device_tracks_by_user_id(
        self, session: AsyncSession, user_id: int
    ) -> Sequence[DeviceTrack]:
        """根据用户ID获取设备跟踪记录列表"""
        stmt = select(DeviceTrack).where(DeviceTrack.user_id == user_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def delete_device_tracks_by_user_id(
        self, session: AsyncSession, user_id: int
    ) -> None:
        """根据用户ID删除设备跟踪记录"""
        stmt = delete(DeviceTrack).where(DeviceTrack.user_id == user_id)
        await session.execute(stmt)
        await session.flush()

    async def delete_device_track_by_id(
        self, session: AsyncSession, track_id: int
    ) -> bool:
        """根据跟踪ID删除设备跟踪记录"""
        stmt = select(DeviceTrack).where(DeviceTrack.id == track_id)
        result = await session.execute(stmt)
        device_track = result.scalar_one_or_none()
        if device_track:
            await session.delete(device_track)
            await session.flush()
            return True
        return False

    async def get_device_track_by_id(
        self, session: AsyncSession, track_id: int
    ) -> DeviceTrack | None:
        """根据跟踪ID获取设备跟踪记录"""
        stmt = select(DeviceTrack).where(DeviceTrack.id == track_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_device_track(
        self, session: AsyncSession, track_id: int, **data
    ) -> DeviceTrack | None:
        """更新设备跟踪记录"""
        purchase_date = data.get("purchase_date")
        if isinstance(purchase_date, str):
            data["purchase_date"] = datetime.fromisoformat(purchase_date)
        stmt = select(DeviceTrack).where(DeviceTrack.id == track_id)
        result = await session.execute(stmt)
        device_track = result.scalar_one_or_none()
        if device_track:
            for key, value in data.items():
                setattr(device_track, key, value)
            await session.flush()
            await session.refresh(device_track)
            return device_track
        return None

    async def get_active_devices(
        self, session: AsyncSession
    ) -> Sequence[DeviceTrack]:
        """获取所有活跃设备"""
        stmt = select(DeviceTrack).where(DeviceTrack.status == "active")
        result = await session.execute(stmt)
        return result.scalars().all()
