from app.core.logger import logger
from app.models.weread import Archive, UserBook


class ShelfQuery:
    """书架复合查询"""

    async def get_user_shelf(
        self, user_id: int
    ) -> tuple[list[UserBook], list[Archive]]:
        """获取用户书架信息，自动加载关联的 WereadBook"""
        user_books = (
            await UserBook.find(UserBook.user_id == user_id, fetch_links=True)
            .sort(-UserBook.readUpdateTime)  # pyright: ignore[reportArgumentType, reportOptionalOperand]
            .to_list()
        )
        # logger.info(user_books)
        user_archives = await Archive.find(
            Archive.user_id == user_id
        ).to_list()
        logger.info(
            f"获取用户 {user_id} 书架信息：{len(user_books)} 本书，{len(user_archives)} 个书单"
        )
        return user_books, user_archives
