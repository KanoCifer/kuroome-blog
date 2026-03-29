from __future__ import annotations

import hashlib

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


def _build_feishu_dedup_key(
    message: str, msg_type: str, title: str | None
) -> str:
    source = f"{msg_type}|{title or ''}|{message}"
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()
    return f"feishu_message_lock:{digest}"


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
    message = message.strip()
    url: str = get_settings().FEISHU_WEBHOOK_URL

    if not message:
        logger.warning("飞书消息内容为空，跳过发送")
        return

    if not url:
        logger.warning("未配置 FEISHU_WEBHOOK_URL，跳过发送飞书消息")
        return

    redis = getattr(context.state, "redis", None)
    if redis is None:
        logger.warning("Taskiq Redis 未初始化，跳过发送飞书消息")
        return

    dedup_key = _build_feishu_dedup_key(
        message=message, msg_type=msg_type, title=title
    )

    try:
        async with dedup_guard(redis=redis, key=dedup_key, ttl=60):
            payload: FeishuMessageContent | FeishuRichTextContent = (
                _create_feishu_message(
                    message=message, msg_type=msg_type, title=title
                )
            )
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(10.0)
                ) as client:
                    response: httpx.Response = await client.post(
                        url=url, json=payload.model_dump()
                    )
                    response.raise_for_status()
                    body = response.json() if response.content else {}
                    if isinstance(body, dict):
                        code = body.get("code", body.get("StatusCode"))
                        if code not in (0, "0"):
                            logger.error(
                                "飞书 API 响应异常: %s",
                                body,
                            )
            except Exception as e:
                logger.error(f"发送飞书消息失败: {e!r}")
    except Exception as e:
        logger.warning(f"获取分布式锁失败，跳过发送飞书消息: {e!r}")
