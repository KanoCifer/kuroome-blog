from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import GalleryImage


class GalleryRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(self) -> list[GalleryImage]:
        result = await self.session.execute(
            select(GalleryImage).order_by(
                GalleryImage.sort_order, GalleryImage.created_at.desc()
            )
        )
        return list(result.scalars().all())

    async def save_images(self, images: list[GalleryImage]) -> None:
        """Replace all gallery images in a transaction."""
        await self.session.execute(GalleryImage.__table__.delete())
        for img in images:
            self.session.add(img)
        await self.session.flush()

    async def delete_all(self) -> None:
        await self.session.execute(GalleryImage.__table__.delete())
        await self.session.flush()
