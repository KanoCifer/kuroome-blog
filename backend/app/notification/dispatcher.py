from app.notification.bark_channel import BarkNotificationChannel
from app.notification.email_channel import EmailNotificationChannel
from app.notification.feishu_channel import FeishuNotificationChannel

from . import NotificationPayload, NotifierBase  # noqa: TID252


class NotificationDispatcher:
    def __init__(self):
        self._channels: dict[str, NotifierBase] = {
            "email": EmailNotificationChannel(),
            "feishu": FeishuNotificationChannel(),
            "bark": BarkNotificationChannel(),
        }

    async def dispatch(
        self,
        payload: NotificationPayload,
        reminder_config: dict,
        user_id: int,
        channels: list[str],
    ) -> dict[str, bool]:  # {channel_name: success}
        results = {}
        for channel_name in channels:
            channel = self._channels.get(channel_name)
            if not channel:
                results[channel_name] = False
                continue
            if not await channel.validate_config():
                results[channel_name] = False
                continue
            results[channel_name] = await channel.send(
                user_id=user_id, payload=payload, config=reminder_config
            )
        return results
