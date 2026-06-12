from __future__ import annotations

from app.models.weread import ReadDetailSnapshot
from app.services.weread.base import WereadBaseService
from app.services.weread.utils import _normalize_cover_url


class WereadStatsService(WereadBaseService):
    """微信读书阅读统计服务"""

    # ── 阅读统计 ─────────────────────────────────────────────────

    async def orchestra_read_detail(
        self,
        user_id: int,
        *,
        mode: str = "weekly",
        base_time: int | None = None,
    ) -> ReadDetailSnapshot:
        """拉取指定 mode + 周期的阅读统计快照。

        - mode: weekly | monthly | annually | overall
        - base_time: 目标周期 unix 秒。None = 当前周期；overall 模式忽略
        """
        extra: dict = {"mode": mode}
        if base_time is not None and mode != "overall":
            extra["baseTime"] = base_time

        raw = await self._send_http_request(
            user_id, api_name="/readdata/detail", extra=extra
        )
        return self._parse_read_detail(raw, user_id, mode)

    def _parse_read_detail(self, raw: dict, user_id: int, mode: str):
        """将 /readdata/detail 原始响应解析为快照"""
        from app.models.weread import (
            PreferCategoryItem,
            ReadLongestItem,
        )

        read_longest = None
        if raw.get("readLongest"):
            read_longest = []
            for item in raw["readLongest"]:
                # 有声内容走 albumInfo，电子书/出版书走 book，且 book 是扁平结构
                info = item.get("book") or item.get("albumInfo") or {}
                read_longest.append(
                    ReadLongestItem(
                        bookId=info.get("bookId"),
                        title=info.get("title"),
                        author=info.get("author"),
                        cover=_normalize_cover_url(info.get("cover")),
                        readTime=item.get("readTime", 0),
                        tags=item.get("tags", []),
                    )
                )

        prefer_category = None
        if raw.get("preferCategory"):
            prefer_category = [
                PreferCategoryItem(
                    categoryTitle=c["categoryTitle"],
                    readingTime=c["readingTime"],
                    readingCount=c["readingCount"],
                )
                for c in raw["preferCategory"]
            ]

        return ReadDetailSnapshot(
            user_id=user_id,
            mode=mode,
            baseTime=raw.get("baseTime", 0),
            totalReadTime=raw.get("totalReadTime"),
            readDays=raw.get("readDays"),
            dayAverageReadTime=raw.get("dayAverageReadTime"),
            compare=raw.get("compare"),
            readRate=raw.get("readRate"),
            wrReadTime=raw.get("wrReadTime"),
            wrListenTime=raw.get("wrListenTime"),
            readTimes=raw.get("readTimes"),
            readLongest=read_longest,
            preferCategory=prefer_category,
            preferTime=raw.get("preferTime"),
            preferAuthor=raw.get("preferAuthor"),
            preferPublisher=raw.get("preferPublisher"),
        )
