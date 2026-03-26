from __future__ import annotations

from datetime import UTC, datetime

from beanie import SortDirection

from app.models.beanie import MessageBoard


class MessageRepository:
    async def list_approved_messages(self) -> list[MessageBoard]:
        return await (
            MessageBoard.find({"review": 1})
            .sort([("created_at", SortDirection.DESCENDING)])
            .to_list(length=None)
        )

    @staticmethod
    def build_message_entry(
        *,
        name: str,
        message: str,
        from_admin: bool,
    ) -> MessageBoard:
        return MessageBoard(
            name=name,
            message=message,
            created_at=datetime.now(UTC),
            review=0,
            from_admin=from_admin,
        )

    async def create_message(
        self,
        entry: MessageBoard,
    ) -> MessageBoard:
        created = await MessageBoard.insert_one(entry)
        if created is None:
            raise RuntimeError("Message insert returned empty result")
        return created
