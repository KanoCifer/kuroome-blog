from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import PasskeyCredential, User


class PasskeyMixin:
    """PasskeyCredential 表 CRUD 操作。"""

    session: AsyncSession

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
