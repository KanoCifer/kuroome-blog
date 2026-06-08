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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


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
    token: Annotated[str, Depends(oauth2_scheme)],
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
