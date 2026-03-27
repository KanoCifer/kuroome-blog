from __future__ import annotations

from html import escape

from app.repositories.message_repo import MessageRepo
from app.schemas.message import MessageIn


class MessageDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class MessageService:
    def __init__(self, repo: MessageRepo) -> None:
        self.repo = repo

    async def get_messages(self) -> dict[str, list[dict]]:
        try:
            messages = await self.repo.list_approved_messages()
        except Exception as exc:
            raise MessageDomainError(
                f"Failed to retrieve messages: {exc!s}",
                500,
            ) from exc

        payload = [
            {
                "id": str(msg.id),
                "name": msg.name,
                "message": msg.message,
                "created_at": msg.created_at.isoformat()
                if msg.created_at
                else None,
                "from_admin": getattr(msg, "from_admin", False),
            }
            for msg in messages
        ]
        return {"messages": payload}

    async def create_message(
        self,
        message_in: MessageIn,
        is_admin: bool,
    ) -> dict[str, str]:
        name = str(escape(message_in.name.strip()))
        message = str(escape(message_in.message.strip()))
        entry = self.repo.build_message_entry(
            name=name,
            message=message,
            from_admin=is_admin,
        )

        try:
            created = await self.repo.create_message(entry)
        except Exception as exc:
            raise MessageDomainError(
                f"Failed to submit message: {exc!s}",
                500,
            ) from exc

        return {"id": str(created.id)}
