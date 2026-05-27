from __future__ import annotations

from typing import Literal

from bson import ObjectId

from app.models.fishing import FishingRecord


class FishingRepo:
    def __init__(self) -> None:
        pass

    async def save_fishing_record(self, record: dict) -> ObjectId:
        """保存钓鱼记录到 MongoDB"""
        doc = FishingRecord(**record)
        await doc.insert()
        return doc.id  # type: ignore

    async def get_latest_records(
        self, location_id: str, limit: int = 10
    ) -> list[FishingRecord]:
        """获取指定地点的最新钓鱼记录"""
        records = (
            await FishingRecord.find({"location_id": location_id})
            .sort("-fishing_time")
            .limit(limit)
            .to_list()
        )
        return records

    async def get_all_records_for_training(self) -> list[FishingRecord]:
        """获取所有有反馈分数的记录用于模型训练"""
        records = (
            await FishingRecord.find({"feedback_score": {"$gte": 0}})
            .sort("-fishing_time")
            .to_list()
        )
        return records

    async def get_records_for_training_by_source(
        self, source: Literal["user", "ai"]
    ) -> list[FishingRecord]:
        """获取指定来源的训练记录"""
        records = (
            await FishingRecord.find(
                {"feedback_score": {"$gte": 0}, "source": source}
            )
            .sort("-fishing_time")
            .to_list()
        )
        return records

    async def count_records(self) -> int:
        """统计总记录数"""
        return await FishingRecord.count()

    async def get_latest_record(self) -> FishingRecord | None:
        """获取最新的钓鱼记录（按 fishing_time 降序）"""
        record = await FishingRecord.find_one({}, sort=[("fishing_time", -1)])
        return record
