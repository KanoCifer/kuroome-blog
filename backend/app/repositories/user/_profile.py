from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Profile, User


class ProfileMixin:
    """Profile 表 CRUD 操作。"""

    session: AsyncSession

    async def get_profile(self, user_id: int) -> Profile | None:
        """
        根据用户 ID 查询 Profile。

        :param user_id: 用户 ID
        :return: Profile 对象或 None
        """
        result = await self.session.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_profile(
        self,
        user_id: int,
        email: str | None = None,
        photo: str | None = "default.png",
    ) -> Profile:
        """
        创建用户 Profile。

        :param user_id: 用户 ID
        :param email: 邮箱地址
        :param photo: 头像文件名，默认 "default.png"
        :return: 已创建的 Profile 对象
        """
        profile = Profile(user_id=user_id)
        if email:
            profile.email = email
        if photo:
            profile.photo = photo
        self.session.add(profile)
        return profile

    async def ensure_profile(self, user: User) -> Profile:
        """
        确保用户有 Profile，不存在则自动创建。

        :param user: 用户对象
        :return: Profile 对象
        """
        if not user.profile:
            profile = Profile(user_id=user.id)
            self.session.add(profile)
            await self.session.flush()
            await self.session.refresh(user)
            return profile
        return user.profile

    async def update_profile(
        self,
        profile: Profile,
        *,
        email: str | None = None,
        gender: str | None = None,
        mobile: str | None = None,
        photo: str | None = None,
    ) -> None:
        """
        更新 Profile 字段（仅更新非 None 的字段）。

        :param profile: Profile 对象
        :param email: 邮箱地址
        :param gender: 性别
        :param mobile: 手机号
        :param photo: 头像文件名
        """
        if email is not None:
            profile.email = email
        if gender is not None:
            profile.gender = gender
        if mobile is not None:
            profile.mobile = mobile
        if photo is not None:
            profile.photo = photo

    async def is_email_taken(
        self, email: str, *, exclude_user_id: int | None = None
    ) -> bool:
        """
        检查邮箱是否已被占用。

        :param email: 邮箱地址
        :param exclude_user_id: 排除的用户 ID（更新自身时使用）
        :return: True 表示已被占用
        """
        stmt = select(Profile).where(Profile.email == email)
        result = await self.session.execute(stmt)
        profile = result.scalar_one_or_none()
        if profile is None:
            return False
        return not (exclude_user_id and profile.user_id == exclude_user_id)
