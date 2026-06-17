"""NotificationContext 构造器 —— 业务层的 config 解析桥接。

把 reminder_config（dict）和 user_id 解析为通用传输插件所需的
:class:`NotificationContext`，承担原 channel 内部的 Profile DB 回退逻辑。
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.des.db import get_async_session
from app.models.models import User
from app.plugins.notification import NotificationContext


async def context_from_config(
    user_id: int, config: dict
) -> NotificationContext:
    """从 reminder_config 构造 NotificationContext。

    优先级：config 字段 > Profile DB 回退。

    - email: config["email"] → Profile.email
    - feishu_webhook_url: config["feishu_webhook_url"]（无 DB 回退；
      真正发送时 feishu channel 还会用 settings.FEISHU_WEBHOOK_URL 兜底）
    - bark_device_key: config["bark_device_key"] → Profile.bark_device_key
    """
    email = config.get("email")
    bark_key = config.get("bark_device_key")
    feishu_url = config.get("feishu_webhook_url")

    # 任一缺失 → 查 Profile
    if not email or not bark_key:
        profile = await _get_user_profile(user_id)
        if profile and not email:
            email = profile.email
        if profile and not bark_key:
            bark_key = getattr(profile, "bark_device_key", None)

    return NotificationContext(
        email=email,
        feishu_webhook_url=feishu_url,
        bark_device_key=bark_key,
    )


async def _get_user_profile(user_id: int):
    async with get_async_session() as session:
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.profile))
        )
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user or not user.profile:
            return None
        return user.profile
