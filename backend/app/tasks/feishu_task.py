from __future__ import annotations

import httpx
from taskiq import (
    Context,
    TaskiqDepends,
)

from app.core.config import get_settings
from app.core.logger import logger
from app.schemas import (
    FeishuMessageContent,
    FeishuRichTextContent,
)
from app.tasks.broker import broker
from app.utils import dedup_guard


def _create_feishu_message(
    message: str, msg_type: str = "text", title: str | None = None
) -> FeishuMessageContent | FeishuRichTextContent:
    message = message.strip()
    if msg_type == "post":
        # 飞书富文本消息格式需要包含 post 字段，content 是二维数组
        content = {
            "post": {
                "zh_cn": {
                    "title": title,
                    "content": [
                        [
                            {
                                "tag": "at",
                                "user_id": "all",
                                "user_name": "所有人",
                            },
                            {
                                "tag": "text",
                                "text": message,
                            },
                        ],
                        [
                            {
                                "tag": "a",
                                "text": "网站首页",
                                "href": "https://kanocifer.chat",
                            },
                        ],
                    ],
                }
            }
        }
        return FeishuRichTextContent(msg_type="post", content=content)
    else:
        return FeishuMessageContent(
            msg_type=msg_type,
            content={"text": message},
        )


@broker.task
async def send_feishu_message(
    message: str,
    msg_type: str = "text",
    title: str | None = None,
    context: Context = TaskiqDepends(),
):
    """发送飞书消息
    :param message: 消息内容
    :param msg_type: 消息类型，默认为 "text"，可选 "post"
    :param title: 消息标题，仅 msg_type="post" 时生效
    :param context: Taskiq 上下文对象，自动注入
    """
    url: str = get_settings().FEISHU_WEBHOOK_URL
    if not message or not url:
        return

    # 使用去重守卫确保在 TTL 窗口内只发送一次消息
    redis = context.state.redis

    try:
        async with dedup_guard(
            redis=redis, key="feishu_message_lock", ttl=300
        ):
            payload: FeishuMessageContent | FeishuRichTextContent = (
                _create_feishu_message(
                    message=message, msg_type=msg_type, title=title
                )
            )
            try:
                async with httpx.AsyncClient() as client:
                    response: httpx.Response = await client.post(
                        url=url, json=payload.model_dump()
                    )
                    response.raise_for_status()
            except Exception as e:
                logger.error(f"发送飞书消息失败: {e!r}")
    except Exception as e:
        logger.warning(f"获取分布式锁失败，跳过发送飞书消息: {e!r}")
