from pydantic import BaseModel

from app.services.weread.base import WereadBaseService
from app.services.weread.utils import _normalize_cover_url


class RecommendResponse(BaseModel):
    bookId: str  # noqa: N815
    title: str
    author: str
    cover: str | None = None
    reason: str
    readingCount: int = 0  # noqa: N815
    searchIdx: int = 0  # noqa: N815
    newRating: int = 0  # noqa: N815  0-100
    intro: str | None = None
    category: str | None = None


class BooksRecommend(WereadBaseService):
    """书籍推荐服务"""

    async def fetch_books_recommend(
        self,
        user_id: int,
        count: int = 12,
        maxIdx: int = 0,  # noqa: N803
    ) -> list[RecommendResponse]:
        """从微信读书远端获取推荐阅读的书籍

        count: 要获取的书籍数量
        maxIdx: 最大索引，用于分页 默认为0，第一页
        """
        params = {"count": count, "maxIdx": maxIdx}
        res = await self._send_http_request(
            user_id=user_id, api_name="/book/recommend", extra=params
        )
        # 远端可能直接返回 list，也可能包一层 {"books": [...]}
        items = res if isinstance(res, list) else res.get("books", [])
        out: list[RecommendResponse] = []
        for item in items:
            book = item.get("book") or item
            out.append(
                RecommendResponse(
                    bookId=book.get("bookId", ""),
                    title=book.get("title", ""),
                    author=book.get("author", ""),
                    cover=_normalize_cover_url(book.get("cover")),
                    reason=item.get("reason") or book.get("reason", ""),
                    readingCount=item.get("readingCount")
                    or book.get("readingCount", 0),
                    searchIdx=item.get("searchIdx", 0),
                    newRating=item.get("newRating")
                    or book.get("newRating", 0),
                    intro=book.get("intro"),
                    category=book.get("category"),
                )
            )
        return out
