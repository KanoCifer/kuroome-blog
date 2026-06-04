from __future__ import annotations

from app.services.weread.base import WereadBaseService


class WereadStatsService(WereadBaseService):
    """微信读书阅读统计服务"""

    # ── 阅读统计 ─────────────────────────────────────────────────

    async def sync_read_detail(self, user_id: int, mode: str = "monthly") -> int:
        """同步阅读统计，返回保存的快照数"""
        raw = await self._send_http_request(
            user_id, api_name="/readdata/detail", extra={"mode": mode}
        )
        snapshot = self._parse_read_detail(raw, user_id, mode)
        await self.repo.upsert_read_detail_snapshot(snapshot)
        return 1

    async def get_read_detail_trends(
        self, user_id: int, mode: str = "monthly"
    ) -> list[dict]:
        """查询历史阅读快照，按时间升序"""
        snapshots = await self.repo.get_read_detail_snapshots(user_id, mode)
        return [
            {
                "baseTime": s.baseTime,
                "totalReadTime": s.totalReadTime,
                "readDays": s.readDays,
                "dayAverageReadTime": s.dayAverageReadTime,
                "compare": s.compare,
                "readRate": s.readRate,
                "wrReadTime": s.wrReadTime,
                "wrListenTime": s.wrListenTime,
                "readLongest": (
                    [item.model_dump() for item in s.readLongest]
                    if s.readLongest
                    else []
                ),
                "preferCategory": (
                    [item.model_dump() for item in s.preferCategory]
                    if s.preferCategory
                    else []
                ),
                "preferTime": s.preferTime,
                "fetched_at": s.fetched_at.isoformat(),
            }
            for s in snapshots
        ]

    def _parse_read_detail(self, raw: dict, user_id: int, mode: str):
        """将 /readdata/detail 原始响应解析为快照文档"""
        from app.models.weread import (
            PreferCategoryItem,
            ReadDetailSnapshot,
            ReadLongestItem,
        )

        read_longest = None
        if raw.get("readLongest"):
            read_longest = [
                ReadLongestItem(
                    bookId=item.get("book", {}).get("bookInfo", {}).get("bookId"),
                    title=item.get("book", {}).get("bookInfo", {}).get("title"),
                    author=item.get("book", {}).get("bookInfo", {}).get("author"),
                    cover=item.get("book", {}).get("bookInfo", {}).get("cover"),
                    readTime=item.get("readTime", 0),
                )
                for item in raw["readLongest"]
            ]

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
