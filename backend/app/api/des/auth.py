"""Auth dependencies.

提供两类用户解析：
- `manager`（= `get_current_user`）：强制 Bearer token，缺失或无效一律 401。57 处调用方零修改。
- `optional_user`：允许匿名（无 Authorization 头或 token 无效），返回 User | None。
  仅供公开 AI 端点等"未登录可用"的场景；调用方需自行决定如何回退（IP、cookie 等）。
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select

from app.api.des.db import get_session

# 加载环境变量
from app.core.config import get_settings
from app.models.models import User

settings = get_settings()

if settings.SECRET_KEY is None:
    raise ValueError("SECRET_KEY must not be None")

ALGORITHM = "HS256"

# 强校验：缺 token 抛 401。auto_error=True（默认值），保留旧行为。
oauth2_scheme_strict = OAuth2PasswordBearer(tokenUrl="/auth/token")

# 弱校验：缺 token 不抛错，handler 自取 None。供 optional_user 使用。
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/auth/token", auto_error=False
)


def create_access_token(*, sub: str, expires: timedelta) -> str:
    """Helper to create an encoded JWT access token."""
    payload = {"sub": sub, "exp": datetime.now(UTC) + expires}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


async def get_user(user_id: str) -> User | None:
    """根据用户 ID 加载用户对象的回调函数.

    Args:
        user_id: 用户 ID

    Returns:
        User 对象或 None如果用户不存在
    """
    async for session in get_session():
        result = await session.execute(
            select(User).where(User.id == int(user_id))
        )
        user: User | None = result.scalar_one_or_none()
        return user


async def resolve_user_from_token(token: str) -> User | None:
    """给定原始 token 字符串, 返回 User 或 None. 给非 Depends 路径用."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
    except JWTError:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return await get_user(user_id)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme_strict)],
) -> User:
    """从 Authorization: Bearer 头取 access token, 返回 User."""
    user = await resolve_user_from_token(token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def optional_user(
    token: Annotated[str | None, Depends(oauth2_scheme_optional)],
) -> User | None:
    """可选用户依赖：未登录 / token 无效返回 None，登录成功返回 User。

    设计意图：让 AI 总结 / 对话等端点对未登录用户开放，由调用方在 handler
    中按需把 `user_id` 退回到 `anon:<ip>` 一类的访客标识。
    IP 由 handler 通过 `request.client.host` 自行取得。
    """
    if not token:
        return None
    return await resolve_user_from_token(token)


# 保留 manager 别名: 14 个文件 57 处 Depends(manager) 零修改
manager = get_current_user


# =============================================================================
# Admin Dependency
# =============================================================================
async def get_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Dependency to ensure user is admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
