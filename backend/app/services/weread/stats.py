from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from app.models.weread import ReadProgress
from app.models.weread.weread_detail_raw import (
    ReadDetailAnnuallyRaw,
    ReadDetailMonthlyRaw,
    ReadDetailOverallRaw,
    ReadDetailWeeklyRaw,
)
from app.services.weread.base import WereadBaseService

from .utils import _calc_timestamp_to_fetch

# mode → raw model class
_RAW_MODEL_MAP: dict[str, Any] = {
    "weekly": ReadDetailWeeklyRaw,
    "monthly": ReadDetailMonthlyRaw,
    "annually": ReadDetailAnnuallyRaw,
    "overall": ReadDetailOverallRaw,
}


class WereadStatsService(WereadBaseService):
    """微信读书阅读统计服务"""

    # ── 阅读统计 ─────────────────────────────────────────────────

    async def orchestra_read_detail(
        self,
        user_id: int,
        *,
        mode: str = "weekly",
        base_time: int | None = None,
    ) -> ReadDetailWeeklyRaw:
        """拉取指定 mode + 周期的阅读统计快照。

        - mode: weekly | monthly | annually | overall
        - base_time: 目标周期 unix 秒。None = 当前周期；overall 模式忽略

        返回对应 mode 的原始响应模型（不经过二次处理）。
        """
        extra: dict = {"mode": mode}
        if base_time is not None and mode != "overall":
            extra["baseTime"] = base_time

        raw = await self._send_http_request(
            user_id, api_name="/readdata/detail", extra=extra
        )
        model = _RAW_MODEL_MAP[mode]
        return model.model_validate({"user_id": user_id, "mode": mode, **raw})

    async def fetch_yearly_heatmap(
        self, user_id: int, year: int | None = None
    ) -> dict[str, int]:
        """拉取用户指定年份每日的阅读时长(秒)。

        实现:按月并发拉取 /readdata/detail?mode=monthly,合并 12 个月的
        readTimes 为全年日级映射。返回 WeRead 原生形状:
            { "<dayUnixSec>": seconds, ... }
        key 是当天 0:00 的 unix 秒字符串(与 WeRead monthly readTimes 一致),
        前端用 dayjs.unix() 解析成本地日期。

        year=None 走当前年。
        """
        if year is None:
            year = datetime.now().year
        time_list = _calc_timestamp_to_fetch(year)

        # 12 路并发,首屏从 ~12s 降到 ~1s
        raw_list = await asyncio.gather(
            *(
                self._send_http_request(
                    user_id,
                    api_name="/readdata/detail",
                    extra={"mode": "monthly", "baseTime": base_time},
                )
                for base_time in time_list
            )
        )

        result: dict[str, int] = {}
        for raw in raw_list:
            read_times = (raw or {}).get("readTimes") or {}
            for day_ts, secs in read_times.items():
                if not day_ts:
                    continue
                result[str(day_ts)] = int(secs or 0)
        return result

    async def fetch_progress_by_book_id(
        self, bookId: str, user_id: int
    ) -> Any:
        """从远端拉取单本书的阅读进度,并写回本地 Mongo。

        fetch 语义隐含"我想要最新",所以同步落盘。
        书不在用户书架上时 save_book_progress 返回 False,但仍返回
        fetch 到的进度,调用方自行决定如何处理(API 层会把数据返回给前端)。
        """

        extra: dict[str, str] = {"bookId": bookId}
        raw: Any = await self._send_http_request(
            user_id, api_name="/book/getprogress", extra=extra
        )
        # WeRead /book/getprogress 把进度字段包在 raw["book"] 里
        # （顶层只剩 bookId/timestamp），多写一层 .get 兜底直平结构
        progress_payload = raw.get("book", raw)
        read_progress = ReadProgress(**progress_payload)
        await self.repo.save_book_progress(bookId, user_id, read_progress)
        return read_progress

    async def get_book_progress(
        self, bookId: str, user_id: int
    ) -> dict | None:
        """本地优先:从 Mongo 读取;书未同步过则返回 None。

        不会主动触发远端拉取,避免误触限流。
        """

        progress = await self.repo.get_book_progress(bookId, user_id)
        return progress.model_dump(mode="json") if progress else None

    async def refresh_book_progress(self, bookId: str, user_id: int) -> dict:
        """显式刷新:从远端拉取并写本地,返回 dict 形式供 API 序列化。"""
        progress = await self.fetch_progress_by_book_id(bookId, user_id)
        return progress.model_dump(mode="json")
