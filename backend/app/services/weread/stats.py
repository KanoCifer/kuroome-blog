from __future__ import annotations

from app.models.weread import ReadDetailSnapshot
from app.repositories.weread import ReadDetailCache
from app.services.weread.base import WereadBaseService
from app.services.weread.utils import _normalize_cover_url


class WereadStatsService(WereadBaseService):
    """微信读书阅读统计服务"""

    def __init__(self, repo, cache: ReadDetailCache | None = None) -> None:
        super().__init__(repo)
        self.cache = cache or ReadDetailCache()

    # ── 阅读统计 ─────────────────────────────────────────────────

    async def sync_read_detail(
        self, user_id: int, mode: str = "weekly"
    ) -> ReadDetailSnapshot:
        """同步阅读统计，返回保存的快照数"""
        raw = await self._send_http_request(
            user_id, api_name="/readdata/detail", extra={"mode": mode}
        )
        snapshot = self._parse_read_detail(raw, user_id, mode)
        await self.cache.upsert(snapshot)
        return snapshot

    async def orchestra_read_detail(
        self, user_id: int, *, force_refresh: bool = False
    ) -> list[ReadDetailSnapshot]:
        """获取阅读统计，优先 Redis 缓存，缓存为空时自动拉取远端；force_refresh=True 则跳过缓存"""
        snapshots = []
        for mode in ["weekly", "monthly", "annually", "overall"]:
            snapshot = None
            if not force_refresh:
                snapshot = await self.cache.get_latest(
                    user_id, mode
                )
            if snapshot is None:
                snapshot = await self.sync_read_detail(user_id, mode)
            snapshots.append(snapshot)
        return snapshots

    async def get_read_detail_trends(
        self, user_id: int, mode: str = "monthly"
    ) -> list[dict]:
        """查询历史阅读快照，按时间升序"""
        snapshots = await self.cache.list(user_id, mode)
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
