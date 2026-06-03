import asyncio
import re

import httpx

from app.tasks.weread_task import import_books_from_weread


class WereadService:
    """微信读书服务类"""

    def __init__(self, repo) -> None:
        self.repo = repo
        self._import_lock = (
            asyncio.Lock()
        )  # 导入书籍的锁，确保同一时间只有一个导入任务在运行
        self.base_url = "https://i.weread.qq.com/api/agent/gateway"
        self.headers = {
            "Content-Type": "application/json",
        }
        self.sklls_version = "1.0.3"

    async def import_books(
        self, cookie: str, user_id: int, user_agent: str | None = None
    ):
        """从微信读书导入书籍数据"""
        api_url = "https://weread.qq.com/api/user/notebook"

        headers = {
            "User-Agent": user_agent or "ReadingList/2.0",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Cookie": cookie,
        }
        try:
            timeout = httpx.Timeout(15.0)
            async with httpx.AsyncClient(
                timeout=timeout, headers=headers
            ) as client:
                resp = await client.get(api_url)
                resp.raise_for_status()
                book_data = resp.json()

        except httpx.ConnectError as exc:
            raise ValueError(f"网络连接失败: {exc}") from exc
        except httpx.HTTPError as exc:
            raise ValueError(f"Failed to import books: {exc}") from exc
        task = await import_books_from_weread.kiq(book_data, user_id)

        result = await task.wait_result()
        count = (
            result.get("imported_count", 0) if isinstance(result, dict) else 0
        )
        return count

    async def get_user_info(self, user_id: int):
        """获取用户信息"""
        user = await self.repo.get_user_info(user_id)
        if not user:
            raise ValueError("用户信息不存在")
        return user

    async def save_user_info(self, user_id: int, api_key: str):
        """保存用户信息"""
        pattern = r"^wrk\-"
        if not api_key or not re.match(pattern=pattern, string=api_key):
            raise ValueError("无效的API Key格式")
        user = await self.repo.save_user_info(user_id, api_key)
        return user

    async def get_book_info(self, book_id: str):
        """获取书籍信息"""
        book = await self.repo.get_book_info(book_id)
        if not book:
            raise ValueError("书籍信息不存在")
        return book

    async def get_user_shelf(self, user_id: int):
        """获取用户书架信息"""
        user_books, archives = await self.repo.get_user_shelf(user_id)
        return user_books, archives

    async def save_user_book(self, user_book_info):
        """保存用户书籍信息"""
        user_book = await self.repo.save_user_book(user_book_info)
        return user_book

    async def save_user_archive(self, archive_info):
        """保存用户书单信息"""
        archive = await self.repo.save_user_archive(archive_info)
        return archive

    def _parse_book_data(self, raw):
        books = raw.get("books", [])
        archives = raw.get("archives", [])
        parsed_books = []
        for book in books:
            parsed = {
                "bookId": book.get("bookId"),
                "title": book.get("title"),
                "author": book.get("author"),
                "cover": book.get("cover"),
                "readUpdateTime": book.get("readUpdateTime"),
                "finishReading": book.get("finishReading"),
                "secret": book.get("secret"),
            }
            parsed_books.append(parsed)
        return parsed_books, archives

    async def sync_my_books(self, user_id: int):
        """从微信读书中获取书籍信息并保存到数据库"""
        header = self.headers | {
            "Authorization": f"Bearer {await self.repo.get_user_token(user_id)}",
        }

        payload = {
            "api_name": "/shelf/sync",
            "skills_version": self.sklls_version,
        }

        try:
            timeout = httpx.Timeout(15.0)
            async with httpx.AsyncClient(
                timeout=timeout, headers=header
            ) as client:
                resp = await client.post(self.base_url, json=payload)
                resp.raise_for_status()
                result = resp.json()
                books_data, archives = self._parse_book_data(result)

        except httpx.ConnectError:
            raise ValueError("网络连接失败")  # noqa: B904
        except httpx.HTTPError as exc:
            raise ValueError(f"Failed to sync books: {exc}") from exc

        # 批量保存到微信读书库 (MongoDB)
        from app.models.weread import Archive, UserBook, WereadBook

        weread_books = [WereadBook(**b) for b in books_data]
        await self.repo.save_books_bulk(weread_books)

        user_books = [
            UserBook(
                user_id=user_id,
                bookId=b["bookId"],
                title=b["title"],
                author=b["author"],
                readUpdateTime=b.get("readUpdateTime"),
                finishReading=b.get("finishReading", False),
                secret=b.get("secret", False),
            )
            for b in books_data
        ]
        await self.repo.save_user_books_bulk(user_books)

        archive_docs = [Archive(**a) for a in archives]
        await self.repo.save_user_archives_bulk(archive_docs)

        return len(books_data)
