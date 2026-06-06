from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user._passkey import PasskeyMixin
from app.repositories.user._profile import ProfileMixin
from app.repositories.user._user import UserMixin


class UserRepo(UserMixin, ProfileMixin, PasskeyMixin):
    """用户数据访问层，封装所有用户相关的数据库查询操作。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session


__all__ = ["UserRepo"]
