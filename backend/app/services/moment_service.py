from __future__ import annotations

from html import escape

from app.core.exceptions import APIError
from app.models.moment import Moment, MomentStatus
from app.repositories.moment_repo import MomentRepo
from app.schemas.moment import MomentCreate, MomentUpdate


class MomentService:
    def __init__(self, repo: MomentRepo) -> None:
        self.repo = repo

    @staticmethod
    def _clean_tags(tags: list[str]) -> list[str]:
        cleaned: list[str] = []
        for tag in tags:
            value = tag.strip()
            if value and value not in cleaned:
                cleaned.append(value[:50])
        return cleaned

    @staticmethod
    def to_dict(moment: Moment) -> dict:
        data = moment.model_dump(mode="json")
        data["id"] = str(moment.id)
        return data

    async def list_public_moments(
        self,
        *,
        page: int,
        page_size: int,
        tag: str | None = None,
    ) -> dict:
        moments, total = await self.repo.list_public_moments(
            page=page,
            page_size=page_size,
            tag=tag.strip() if tag else None,
        )
        return {
            "moments": [self.to_dict(moment) for moment in moments],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def list_admin_moments(
        self,
        *,
        page: int,
        page_size: int,
        status: MomentStatus | None = None,
    ) -> dict:
        moments, total = await self.repo.list_admin_moments(
            page=page,
            page_size=page_size,
            status=status,
        )
        return {
            "moments": [self.to_dict(moment) for moment in moments],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_public_moment(self, moment_id: str) -> dict:
        moment = await self.repo.get_public_moment(moment_id)
        if not moment:
            raise APIError(message="Moment not found", code=404)
        return self.to_dict(moment)

    async def get_admin_moment(self, moment_id: str) -> dict:
        moment = await self.repo.get_admin_moment(moment_id)
        if not moment:
            raise APIError(message="Moment not found", code=404)
        return self.to_dict(moment)

    async def create_moment(self, user_id: int, data: MomentCreate) -> dict:
        payload = data.model_dump()
        payload["content"] = escape(payload["content"].strip())
        payload["tags"] = self._clean_tags(payload.get("tags", []))
        moment = await self.repo.create_moment(user_id=user_id, data=payload)
        return self.to_dict(moment)

    async def update_moment(self, moment_id: str, data: MomentUpdate) -> dict:
        payload = data.model_dump(exclude_unset=True)
        if "content" in payload and payload["content"] is not None:
            payload["content"] = escape(payload["content"].strip())
        if "tags" in payload and payload["tags"] is not None:
            payload["tags"] = self._clean_tags(payload["tags"])
        moment = await self.repo.update_moment(moment_id=moment_id, data=payload)
        if not moment:
            raise APIError(message="Moment not found", code=404)
        return self.to_dict(moment)

    async def delete_moment(self, moment_id: str) -> None:
        deleted = await self.repo.delete_moment(moment_id)
        if not deleted:
            raise APIError(message="Moment not found", code=404)
