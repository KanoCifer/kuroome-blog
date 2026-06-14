from __future__ import annotations


def _calc_timestamp_to_fetch(year: int):
    """计算要获取哪些 baseTime 的 monthly 数据。

    返回该年每个月初的 unix 秒时间戳:
    - 当前年: 1 月 ~ 当月(含)
    - 过去/未来年: 1 月 ~ 12 月

    只返回月初时间戳,避免混入"现在这一刻"造成跨年数据污染。
    """
    from datetime import datetime

    now = datetime.now()
    now_month = now.month
    now_year = now.year

    last_month = now_month if year == now_year else 12
    return [
        int(datetime(year, month, 1, tzinfo=now.tzinfo).timestamp())
        for month in range(1, last_month + 1)
    ]


def _normalize_cover_url(cover: str | None) -> str | None:
    """微信读书 API 返回的 cover/avatar 偶发走 http 协议，前端在 https 站点
    下会触发 Mixed Content 警告。这里统一把外链升级到 https。"""
    if not cover:
        return cover
    if cover.startswith("http://"):
        return "https://" + cover[len("http://") :]
    return cover


def parse_shelf_books(raw: dict) -> tuple[list[dict], list[dict]]:
    """解析 /shelf/sync 回包，拆出书籍基础信息和书单"""
    books = raw.get("books", [])
    archives = raw.get("archives", [])
    parsed = [
        {
            "bookId": b.get("bookId"),
            "title": b.get("title"),
            "author": b.get("author"),
            "cover": _normalize_cover_url(b.get("cover")),
            "readUpdateTime": b.get("readUpdateTime"),
            "finishReading": b.get("finishReading"),
            "secret": b.get("secret"),
            "isTop": b.get("isTop", False),
        }
        for b in books
    ]
    return parsed, archives


def map_book_info(raw: dict) -> dict:
    """将 /book/info 回包映射为 WereadBook 模型字段

    API 字段 → 模型字段：
      bookId → id（_id 复用 bookId）
      intro → introduction
      newRatingDetail → newRatingDetails
    """
    return {
        "id": raw.get("bookId"),
        "title": raw.get("title"),
        "author": raw.get("author"),
        "translator": raw.get("translator"),
        "cover": _normalize_cover_url(raw.get("cover")),
        "introduction": raw.get("intro"),
        "category": raw.get("category"),
        "publisher": raw.get("publisher"),
        "publishTime": raw.get("publishTime"),
        "isbn": raw.get("isbn"),
        "wordCount": raw.get("wordCount"),
        "newRating": raw.get("newRating"),
        "newRatingCount": raw.get("newRatingCount"),
        "newRatingDetails": raw.get("newRatingDetail"),
    }
