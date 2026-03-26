import httpx

from app.tasks import import_books_from_weread


class WereadService:
    """微信读书服务类"""

    def __init__(self, repo) -> None:
        self.repo = repo

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
