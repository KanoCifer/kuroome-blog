from app.models.weread import (
    PreferAuthorItem,
    PreferCategoryItem,
    PreferPublisherItem,
    ReadDetailSnapshot,
    ReadLongestItem,
)
from app.utils import redis_cache


class ReadDetailCache:
    """阅读统计快照的 Redis 缓存层"""

    @staticmethod
    def _cache_key(user_id: int, mode: str) -> str:
        return f"weread:read_detail:{user_id}:{mode}"

    @staticmethod
    def _from_dict(data: dict) -> ReadDetailSnapshot:
        """从 Redis 缓存的 dict 重建 ReadDetailSnapshot，恢复嵌套子类型"""
        read_longest = None
        if data.get("readLongest"):
            read_longest = [
                ReadLongestItem(**item) for item in data["readLongest"]
            ]

        prefer_category = None
        if data.get("preferCategory"):
            prefer_category = [
                PreferCategoryItem(**item) for item in data["preferCategory"]
            ]

        prefer_author = None
        if data.get("preferAuthor"):
            prefer_author = [
                PreferAuthorItem(**item)
                if isinstance(item, dict)
                else PreferAuthorItem(name=item)
                for item in data["preferAuthor"]
            ]

        prefer_publisher = None
        if data.get("preferPublisher"):
            prefer_publisher = [
                PreferPublisherItem(**item)
                if isinstance(item, dict)
                else PreferPublisherItem(name=item)
                for item in data["preferPublisher"]
            ]

        return ReadDetailSnapshot(
            user_id=data["user_id"],
            mode=data["mode"],
            baseTime=data["baseTime"],
            **(
                {"fetched_at": data["fetched_at"]}
                if "fetched_at" in data
                else {}
            ),
            totalReadTime=data.get("totalReadTime"),
            readDays=data.get("readDays"),
            dayAverageReadTime=data.get("dayAverageReadTime"),
            compare=data.get("compare"),
            readRate=data.get("readRate"),
            wrReadTime=data.get("wrReadTime"),
            wrListenTime=data.get("wrListenTime"),
            readTimes=data.get("readTimes"),
            readLongest=read_longest,
            readStat=data.get("readStat"),
            preferCategory=prefer_category,
            preferTime=data.get("preferTime"),
            preferAuthor=prefer_author,
            preferPublisher=prefer_publisher,
        )

    async def get_latest(
        self, user_id: int, mode: str
    ) -> ReadDetailSnapshot | None:
        """获取指定模式的最新快照（baseTime 最大者）"""
        cached: dict[str, dict] = (
            await redis_cache.get(self._cache_key(user_id, mode)) or {}
        )
        if not cached:
            return None
        latest_key = max(cached, key=lambda k: int(k))
        return self._from_dict(cached[latest_key])

    async def upsert(self, snapshot: ReadDetailSnapshot) -> ReadDetailSnapshot:
        """按 (user_id, mode, baseTime) 去重，写入 Redis hash"""
        key = self._cache_key(snapshot.user_id, snapshot.mode)
        cached: dict[str, dict] = await redis_cache.get(key) or {}
        cached[str(snapshot.baseTime)] = snapshot.model_dump(mode="json")
        await redis_cache.set(key, cached, ttl=86400 * 90)
        return snapshot

    async def list(
        self,
        user_id: int,
        mode: str | None = None,
    ) -> list[ReadDetailSnapshot]:
        """查询历史快照，按 baseTime 升序"""
        if mode:
            modes = [mode]
        else:
            modes = ["weekly", "monthly", "annually", "overall"]

        results: list[ReadDetailSnapshot] = []
        for m in modes:
            cached: dict[str, dict] = (
                await redis_cache.get(self._cache_key(user_id, m)) or {}
            )
            for item in cached.values():
                results.append(self._from_dict(item))

        results.sort(key=lambda s: s.baseTime)
        return results
