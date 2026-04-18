"""
钓鱼服务
封装潮汐数据解析、天气数据处理和钓鱼指数计算
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.core.logger import logger
from app.repositories.fishing_repo import FishingRepo
from app.services.fishing_expert import FishingExpertScorer, fishing_expert
from app.services.fishing_model_service import (
    FishingModelService,
    fishing_model_service,
)


@dataclass
class TideInfo:
    """潮汐信息"""

    tide_type: Literal["涨潮", "退潮"]  # 涨潮, 退潮
    tide_level: float  # 潮位 m
    tide_range: float  # 潮差 m
    hours_to_next_tide: float  # 距下一潮汐时间（小时）


@dataclass
class FishingRecord:
    """钓鱼记录"""

    temperature: float
    humidity: float
    pressure: float
    wind_speed: float
    precipitation: float
    tide_type: str  # "涨潮" | "退潮"
    hours_to_next_tide: float
    tide_range: float
    indices: int


class FishingService:
    """钓鱼服务"""

    def __init__(
        self,
        repo: FishingRepo | None = None,
        expert: FishingExpertScorer = fishing_expert,
        model_svc: FishingModelService = fishing_model_service,
    ) -> None:
        self.repo: FishingRepo | None = repo
        self.expert = expert
        self.model_svc = model_svc

    def parse_weather_data(self, weather_data: dict) -> dict:
        """从天气数据中提取钓鱼相关特征"""
        data = weather_data.get("current", {})
        now = data.get("now", {})
        return {
            "temperature": float(now.get("temp", 20.0)),
            "humidity": float(now.get("humidity", 50.0)),
            "pressure": float(now.get("pressure", 1000.0)),
            "wind_speed": float(now.get("windSpeed", 0.0)),
            "precipitation": float(now.get("precip", 0.0)),
        }

    def get_qweather_index(self, weather_data: dict) -> float:
        """提取天气数据中的和风指数特征"""
        indices = weather_data.get("indices", {})
        level = indices.get("daily", [])[0].get("level", 2)  # 默认2
        return int(level)

    def parse_tide_info(self, tide_data: dict) -> TideInfo:
        """
        解析潮汐数据

        QWeather API 返回格式:
        {
            "tideTable": [
                {"fxTime": "2021-02-06T03:48+08:00", "height": "2.17", "type": "H"},
                {"fxTime": "2021-02-06T10:12+08:00", "height": "0.21", "type": "L"},
                ...
            ],
            "tideHourly": [...]
        }

        Args:
            tide_data: 潮汐数据字典，来自和风天气 API

        Returns:
            解析后的潮汐信息
        """
        from datetime import datetime, timedelta, timezone

        tide_table = tide_data.get("tideTable", [])

        if not tide_table:
            return TideInfo(
                tide_type="涨潮",
                tide_level=1.5,
                tide_range=1.5,
                hours_to_next_tide=3.0,
            )

        now = datetime.now(timezone(timedelta(hours=8)))  # 北京时间

        # 找到当前潮汐点和下一潮汐点
        current_tide = None
        next_tide = None

        for i, tide in enumerate(tide_table):
            tide_time_str = tide.get("fxTime", "")
            try:
                tide_time = datetime.fromisoformat(tide_time_str)
                if tide_time >= now and current_tide is None:
                    current_tide = tide
                    next_tide = (
                        tide_table[i + 1] if i + 1 < len(tide_table) else None
                    )
                    break
            except ValueError, OSError:
                continue

        # 没找到则取第一个
        if current_tide is None:
            current_tide = tide_table[0]
            next_tide = tide_table[1] if len(tide_table) > 1 else None

        tide_type = "涨潮" if current_tide.get("type", "H") == "H" else "退潮"
        tide_level = float(current_tide.get("height", 1.5))

        # 潮差 = 相邻潮汐点的高度差
        tide_range = 1.5
        if next_tide:
            next_level = float(next_tide.get("height", 1.5))
            tide_range = abs(next_level - tide_level)

        # 距下一潮汐时间
        hours_to_next_tide = 3.0
        if next_tide:
            try:
                next_time = datetime.fromisoformat(next_tide.get("fxTime", ""))
                delta = next_time - now
                hours_to_next_tide = max(0, delta.total_seconds() / 3600)
            except ValueError, OSError:
                pass

        return TideInfo(
            tide_type=tide_type,
            tide_level=tide_level,
            tide_range=tide_range,
            hours_to_next_tide=hours_to_next_tide,
        )

    def build_record(
        self,
        weather_data: dict,
        tide_info: TideInfo,
        indices: int = 2,
    ) -> FishingRecord:
        """
        从天气和潮汐数据构建钓鱼记录

        Args:
            weather_data: 完整天气数据
            tide_info: 解析后的潮汐信息
            indices: 和风指数 1-3

        Returns:
            钓鱼记录
        """
        now = weather_data.get("now", weather_data.get("current", {}))

        return FishingRecord(
            temperature=float(now.get("temp", 20)),
            humidity=float(now.get("humidity", 50)),
            pressure=float(now.get("pressure", 1013)),
            wind_speed=float(now.get("windSpeed", 0)),
            precipitation=float(now.get("precip", 0)),
            indices=indices,
            tide_type=tide_info.tide_type,
            hours_to_next_tide=tide_info.hours_to_next_tide,
            tide_range=tide_info.tide_range,
        )

    def calculate_fishing_index(
        self, record: FishingRecord
    ) -> tuple[int, int, float, dict[str, float]]:
        """
        计算钓鱼指数

        Args:
            record: 钓鱼记录

        Returns:
            (最终指数, 专家评分, 残差, 特征评分详情)
        """
        # 转换为 dict 以便专家计算
        record_dict = {
            "temperature": record.temperature,
            "humidity": record.humidity,
            "pressure": record.pressure,
            "wind_speed": record.wind_speed,
            "precipitation": record.precipitation,
            "indices": record.indices,
            "tide_type": record.tide_type,
            "hours_to_tide": record.hours_to_next_tide,
            "tide_range": record.tide_range,
        }

        # 专家评分
        expert_score = self.expert.calculate(**record_dict)
        feature_breakdown = self.expert.get_feature_scores(**record_dict)

        # sklearn 预测残差
        residual = self.model_svc.predict_residual(record_dict)

        # 最终分数
        final_score = expert_score + residual
        final_score = max(0, min(100, final_score))

        return (
            int(final_score),
            int(expert_score),
            round(residual, 1),
            feature_breakdown,
        )

    async def auto_train_if_needed(self) -> dict | None:
        """
        检查记录数并自动训练模型

        当记录数 > 3 时自动触发全量训练

        Returns:
            训练结果 dict 或 None（记录不足时）
        """
        if self.repo is None:
            logger.warning("[钓鱼模型] 未配置 repo，无法进行自动训练")
            return None

        try:
            records = await self.repo.get_all_records_for_training()
            record_count = len(records)

            logger.info(
                f"[钓鱼模型] 当前有 {record_count} 条记录，开始检查是否需要训练"
            )

            if record_count <= 3:
                logger.info(f"[钓鱼模型] 记录数 {record_count} <= 3，跳过训练")
                return None

            # 构建训练数据
            record_dicts = []
            expert_scores = []
            actual_scores = []

            for record in records:
                record_dicts.append(
                    {
                        "temperature": record.temperature,
                        "humidity": record.humidity,
                        "pressure": record.pressure,
                        "wind_speed": record.wind_speed,
                        "precipitation": record.precipitation,
                        "indices": record.indices,
                        "tide_type": "涨潮"
                        if record.tide_type == "H"
                        else "退潮",
                        "hours_to_next_tide": record.hours_to_next_tide,
                        "tide_range": record.tide_range,
                    }
                )
                expert_scores.append(record.expert_score)
                actual_scores.append(record.feedback_score)

            logger.info(
                f"[钓鱼模型] 开始训练，使用 {len(record_dicts)} 条记录"
            )
            result = self.model_svc.train(
                record_dicts, expert_scores, actual_scores
            )
            logger.info(f"[钓鱼模型] 训练完成: {result}")
            return result

        except Exception as e:
            logger.error(f"[钓鱼模型] 自动训练失败: {e}", exc_info=True)
            return None

    def get_level(
        self, index: float
    ) -> Literal["爆护", "好", "一般", "差", "空军"]:
        """根据指数获取等级"""
        if index >= 90:
            return "爆护"
        elif index >= 70:
            return "好"
        elif index >= 50:
            return "一般"
        elif index >= 25:
            return "差"
        else:
            return "空军"

    async def save_feedback(self, doc_data: dict) -> str:
        """保存钓鱼反馈记录到 MongoDB"""
        if self.repo is None:
            logger.warning("[钓鱼服务] 未配置 repo，无法保存反馈")
            return "no_repo"

        try:
            record_id = await self.repo.save_fishing_record(doc_data)
            logger.info(f"[钓鱼服务] 反馈记录已保存: {record_id}")
            return str(record_id)

        except Exception as e:
            logger.error(f"[钓鱼服务] 保存反馈记录失败: {e}", exc_info=True)
            return "save_failed"


# 全局实例
fishing_service = FishingService()
