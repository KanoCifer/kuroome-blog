"""Feishu message schemas."""

from __future__ import annotations

from pydantic import BaseModel


class FeishuMessageContent(BaseModel):
    """飞书消息内容模型"""

    msg_type: str = "text"
    content: dict | None = None


class FeishuRichTextContent(BaseModel):
    """飞书富文本内容模型"""

    msg_type: str = "post"
    content: dict | None = None
