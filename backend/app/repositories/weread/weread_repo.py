from app.repositories.weread._archives import ArchiveRepo
from app.repositories.weread._books import BookRepo
from app.repositories.weread._user_books import UserBookRepo
from app.repositories.weread._users import UserRepo


class WereadRepo(
    BookRepo,
    UserBookRepo,
    ArchiveRepo,
    UserRepo,
):
    """微信读书数据访问门面（MongoDB）"""
