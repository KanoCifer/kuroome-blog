from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import GalleryImage


class GalleryRepo:
    async def list_all(
        self,
        session: AsyncSession,
    ) -> list[GalleryImage]:
        result = await session.execute(
            select(GalleryImage).order_by(
                GalleryImage.sort_order, GalleryImage.created_at.desc()
            )
        )
        return list(result.scalars().all())

    async def save_images(
        self,
        session: AsyncSession,
        images: list[GalleryImage],
    ) -> None:
        """Replace all gallery images in a transaction."""
        await session.execute(GalleryImage.__table__.delete())
        for img in images:
            session.add(img)
        await session.flush()

    async def delete_all(
        self,
        session: AsyncSession,
    ) -> None:
        await session.execute(GalleryImage.__table__.delete())
        await session.flush()
