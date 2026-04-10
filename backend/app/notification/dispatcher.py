from app.core.logger import logger
from app.notification.bark_channel import BarkNotificationChannel
from app.notification.email_channel import EmailNotificationChannel
from app.notification.feishu_channel import FeishuNotificationChannel

from . import (  # noqa: TID252
    DeviceNotificationPayload,
    NotificationPayload,
    NotifierBase,
)


class NotificationDispatcher:
    def __init__(self) -> None:
        # 初始化可用的通知渠道
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
    ) -> dict[str, bool]:
        """分发订阅通知到不同渠道

        Args:
            payload: 通知内容
            reminder_config: 提醒配置
            user_id: 用户ID
            channels: 需要发送的渠道列表

        Returns:
            dict[str, bool]: 每个渠道的发送结果，True表示成功，False表示失败
        """
        results: dict[str, bool] = {}
        for channel_name in channels:
            channel: NotifierBase | None = self._channels.get(channel_name)
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

    async def dispatch_device_reminder(
        self,
        payload: DeviceNotificationPayload,
        reminder_config: dict,
        user_id: int,
        channels: list[str],
    ) -> dict[str, bool]:
        """分发设备周年提醒到不同渠道

        Args:
            payload: 设备通知内容
            reminder_config: 提醒配置
            user_id: 用户ID
            channels: 需要发送的渠道列表

        Returns:
            dict[str, bool]: 每个渠道的发送结果，True表示成功，False表示失败
        """
        results: dict[str, bool] = {}
        for channel_name in channels:
            channel: NotifierBase | None = self._channels.get(channel_name)
            if not channel:
                results[channel_name] = False
                continue
            if not await channel.validate_config():
                results[channel_name] = False
                continue
            # 尝试调用 send_device_reminder 方法
            send_method = getattr(channel, "send_device_reminder", None)
            if send_method:
                results[channel_name] = await send_method(
                    user_id=user_id, payload=payload, config=reminder_config
                )
            else:
                results[channel_name] = False
                logger.warning(
                    f"[Dispatcher] Channel {channel_name} does not support "
                    f"device reminders"
                )
        return results
