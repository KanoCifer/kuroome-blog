from app.models.weread import User


class WereadRepo:
    """微信读书数据访问类"""

    def __init__(self, session) -> None:
        self.session = session

    async def save_user_info(self, user_id, api_key) -> User:
        """保存用户信息"""
        existing_user = await User.find_one(User.user_id == user_id)
        if existing_user:
            existing_user.api_key = api_key
            await existing_user.save()
            return existing_user
        user = User(user_id=user_id, api_key=api_key)
        await user.insert()
        return user

    async def get_user_info(self, user_id) -> User | None:
        """获取用户信息"""
        user = await User.find_one(User.user_id == user_id)
        return user
