from __future__ import annotations

from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from werkzeug.security import generate_password_hash

from app.core import logger
from app.models.models import PasskeyCredential, Profile, User


class UserRepo:
    """用户数据访问层，封装所有用户相关的数据库查询操作。"""

    def __init__(self, session: AsyncSession) -> None:
        """
        :param session: SQLAlchemy 异步会话实例
        """
        self.session: AsyncSession = session

    # ------------------------------------------------------------------ #
    # User CRUD
    # ------------------------------------------------------------------ #

    async def get_by_id(
        self,
        user_id: int,
        *,
        with_profile: bool = False,
        with_passkey: bool = False,
    ) -> User | None:
        """
        根据用户 ID 查询用户。

        :param user_id: 用户 ID
        :param with_profile: 是否预加载 profile 关联
        :param with_passkey: 是否预加载 passkey 关联
        :return: 用户对象或 None
        """
        stmt = select(User).where(User.id == user_id)
        if with_profile:
            stmt = stmt.options(selectinload(User.profile))
        if with_passkey:
            stmt = stmt.options(selectinload(User.passkey_credential))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        """
        根据用户名查询用户（不含关联）。

        :param username: 用户名
        :return: 用户对象或 None
        """
        result = await self.session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def get_by_username_with_relations(
        self, username: str
    ) -> User | None:
        """
        根据用户名查询用户，预加载 profile 和 passkey。

        :param username: 用户名
        :return: 用户对象或 None
        """
        result = await self.session.execute(
            select(User)
            .where(User.username == username)
            .options(
                selectinload(User.profile),
                selectinload(User.passkey_credential),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_github_id(self, github_id: int) -> User | None:
        """
        根据 GitHub ID 查询用户。

        :param github_id: GitHub 用户 ID
        :return: 用户对象或 None
        """
        result = await self.session.execute(
            select(User)
            .where(User.github_id == github_id)
            .options(
                selectinload(User.profile),
                selectinload(User.passkey_credential),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """
        通过邮箱地址查询用户（JOIN Profile 表）。

        :param email: 邮箱地址
        :return: 用户对象或 None
        """
        result = await self.session.execute(
            select(User)
            .join(Profile)
            .where(Profile.email == email)
            .options(
                selectinload(User.profile),
                selectinload(User.passkey_credential),
            )
        )
        return result.scalar_one_or_none()

    async def create_user(
        self,
        username: str,
        password: str,
        name: str | None = None,
        github_id: int | None = None,
    ) -> User:
        """
        创建新用户。

        :param username: 用户名
        :param password: 明文密码（会自动哈希）
        :param name: 显示名称，默认同用户名
        :param github_id: GitHub ID（OAuth 登录时使用）
        :return: 已创建的用户对象
        """
        user = User(
            username=username,
            github_id=github_id,
            name=name or username,
        )
        user.raw_password = password
        self.session.add(user)
        await self.session.flush()
        return user

    async def update_login_info(
        self,
        user: User,
        request: Request,
    ) -> None:
        """
        更新用户登录信息（时间戳、IP、计数）。

        :param user: 用户对象
        :param request: FastAPI 请求对象，用于提取客户端 IP
        """
        user.active = True
        user.last_login_at = user.current_login_at
        user.current_login_at = datetime.now(UTC)
        user.last_login_ip = user.current_login_ip
        user.current_login_ip = User.get_real_ip(request)
        user.login_count += 1

    async def set_github_id(self, user: User, github_id: int | None) -> None:
        """
        设置或清除用户的 GitHub ID 绑定。

        :param user: 用户对象
        :param github_id: GitHub ID，传 None 则解除绑定
        """
        user.github_id = github_id
        await self.session.flush()

    async def set_active_by_id(self, user_id: int, active: bool) -> None:
        """
        根据用户 ID 设置在线状态（直接执行 UPDATE 语句）。

        用于处理 detached 的 user 对象场景（如 logout）。

        :param user_id: 用户 ID
        :param active: 是否在线
        """
        from sqlalchemy import update

        stmt = update(User).where(User.id == user_id).values(active=active)
        await self.session.execute(stmt)
        await self.session.flush()
        logger.info(f"Set user {user_id} active={active}")

    async def set_password(self, user: User, password: str) -> None:
        """
        更新用户密码（会生成哈希）。

        :param user: 用户对象
        :param password: 明文密码
        """
        user.password_hash = generate_password_hash(password)
        await self.session.flush()

    async def set_name(self, user: User, name: str) -> None:
        """
        更新用户显示名称。

        :param user: 用户对象
        :param name: 新的显示名称
        """
        user.name = name
        await self.session.flush()

    async def set_username(self, user: User, username: str) -> None:
        """
        更新用户名。

        :param user: 用户对象
        :param username: 新的用户名
        """
        user.username = username
        await self.session.flush()

    async def set_username_by_id(self, user_id: int, username: str) -> None:
        """
        根据用户 ID 更新用户名（直接执行 UPDATE 语句）。

        用于处理 detached 的 user 对象场景。

        :param user_id: 用户 ID
        :param username: 新的用户名
        """
        from sqlalchemy import update

        stmt = update(User).where(User.id == user_id).values(username=username)
        await self.session.execute(stmt)
        await self.session.flush()

    async def set_name_by_id(self, user_id: int, name: str) -> None:
        """
        根据用户 ID 更新显示名称（直接执行 UPDATE 语句）。

        用于处理 detached 的 user 对象场景。

        :param user_id: 用户 ID
        :param name: 新的显示名称
        """
        from sqlalchemy import update

        stmt = update(User).where(User.id == user_id).values(name=name)
        await self.session.execute(stmt)
        await self.session.flush()

    async def set_password_by_id(self, user_id: int, password: str) -> None:
        """
        根据用户 ID 更新密码（直接执行 UPDATE 语句）。

        用于处理 detached 的 user 对象场景。

        :param user_id: 用户 ID
        :param password: 明文密码（会自动哈希）
        """
        from sqlalchemy import update

        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(password_hash=generate_password_hash(password))
        )
        await self.session.execute(stmt)
        await self.session.flush()

    # ------------------------------------------------------------------ #
    # Profile CRUD
    # ------------------------------------------------------------------ #

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

    async def is_username_taken(
        self, username: str, *, exclude_user_id: int | None = None
    ) -> bool:
        """
        检查用户名是否已被占用。

        :param username: 用户名
        :param exclude_user_id: 排除的用户 ID（更新自身时使用）
        :return: True 表示已被占用
        """
        stmt = select(User).where(User.username == username)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            return False
        return not (exclude_user_id and user.id == exclude_user_id)

    # ------------------------------------------------------------------ #
    # Passkey CRUD
    # ------------------------------------------------------------------ #

    async def get_passkey_by_user_id(
        self, user_id: int
    ) -> PasskeyCredential | None:
        """
        根据用户 ID 查询 Passkey 凭证。

        :param user_id: 用户 ID
        :return: PasskeyCredential 对象或 None
        """
        result = await self.session.execute(
            select(PasskeyCredential).where(
                PasskeyCredential.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def get_passkey_by_credential_id(
        self, credential_id: str
    ) -> PasskeyCredential | None:
        """
        根据凭证 ID 查询 Passkey，预加载 User 和 Profile。

        :param credential_id: Passkey 凭证 ID
        :return: PasskeyCredential 对象或 None
        """
        result = await self.session.execute(
            select(PasskeyCredential)
            .where(PasskeyCredential.credential_id == credential_id)
            .options(
                selectinload(PasskeyCredential.user).selectinload(
                    User.profile
                ),
                selectinload(PasskeyCredential.user).selectinload(
                    User.passkey_credential
                ),
            )
        )
        return result.scalar_one_or_none()

    async def create_passkey(
        self,
        user_id: int,
        credential_id: str,
        public_key: str,
        sign_count: int,
    ) -> PasskeyCredential:
        """
        创建 Passkey 凭证。

        :param user_id: 用户 ID
        :param credential_id: 凭证 ID（Base64URL 编码）
        :param public_key: 公钥（Base64URL 编码）
        :param sign_count: 签名计数器初始值
        :return: 已创建的 PasskeyCredential 对象
        """
        credential = PasskeyCredential(
            user_id=user_id,
            credential_id=credential_id,
            public_key=public_key,
            sign_count=sign_count,
        )
        self.session.add(credential)
        return credential

    async def update_passkey_sign_count(
        self, credential: PasskeyCredential, sign_count: int
    ) -> None:
        """
        更新 Passkey 签名计数器。

        :param credential: PasskeyCredential 对象
        :param sign_count: 新的签名计数值
        """
        credential.sign_count = sign_count

    async def delete_passkey(self, credential: PasskeyCredential) -> None:
        """
        删除 Passkey 凭证。

        :param credential: PasskeyCredential 对象
        """
        await self.session.delete(credential)

    async def refresh_user(self, user: User) -> None:
        """
        从数据库刷新用户对象状态。

        :param user: 用户对象
        """
        await self.session.refresh(user)
