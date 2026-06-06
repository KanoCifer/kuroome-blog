from __future__ import annotations


def _parse_shelf_books(raw: dict) -> tuple[list[dict], list[dict]]:
    """解析 /shelf/sync 回包，拆出书籍基础信息和书单"""
    books = raw.get("books", [])
    archives = raw.get("archives", [])
    parsed = [
        {
            "bookId": b.get("bookId"),
            "title": b.get("title"),
            "author": b.get("author"),
            "cover": b.get("cover"),
            "readUpdateTime": b.get("readUpdateTime"),
            "finishReading": b.get("finishReading"),
            "secret": b.get("secret"),
            "isTop": b.get("isTop", False),
        }
        for b in books
    ]
    return parsed, archives


def _map_book_info(raw: dict) -> dict:
    """将 /book/info 回包映射为 WereadBook 模型字段

    API 字段 → 模型字段：
      intro → introduction
      newRatingDetail → newRatingDetails
    """
    return {
        "bookId": raw.get("bookId"),
        "title": raw.get("title"),
        "author": raw.get("author"),
        "translator": raw.get("translator"),
        "cover": raw.get("cover"),
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
