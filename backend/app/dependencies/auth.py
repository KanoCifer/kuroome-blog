from fastapi_login import LoginManager
from sqlalchemy import select

# 加载环境变量
from app.configs.config import settings
from app.dependencies.database import get_session
from app.models.models import User

if settings.SECRET_KEY is None:
    raise ValueError("SECRET_KEY must not be None")
manager = LoginManager(
    settings.SECRET_KEY,
    token_url="/auth/token",
    use_cookie=True,
)


@manager.user_loader()
async def load_user(user_id: str) -> User | None:
    """根据用户 ID 加载用户对象的回调函数.

    Args:
        user_id: 用户 ID

    Returns:
        User 对象或 None如果用户不存在
    """
    # 使用异步上下文管理器获取 session
    async for session in get_session():
        result = await session.execute(
            select(User).where(User.id == int(user_id))
        )
        user: User | None = result.scalar_one_or_none()
        return user
