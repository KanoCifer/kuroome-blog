"""
钓鱼指数相关的数据模型
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal

from beanie import Document, Indexed
from pydantic import Field


class FishingRecord(Document):
    """
    钓鱼记录文档
    存储用户每次钓鱼的完整数据：时间、地点、天气、潮汐、用户评分
    """

    # 时间地点
    location_id: Annotated[str, Indexed()]
    location_name: str
    fishing_time: datetime

    # 天气特征
    temperature: float = 20.0  # 温度 °C
    wind_speed: float = 0.0  # 风速 m/s
    pressure: float = 1013.0  # 气压 hPa
    humidity: float = 50.0  # 湿度 %
    precipitation: float = 0.0  # 降水量 mm
    wind_level: int = 1  # 和风指数 1-3

    # 潮汐特征
    tide_level: float = 1.0  # 潮位 m
    tide_type: Literal["H", "L"] = "H"  # 高潮/低潮
    tide_range: float = 1.5  # 潮差 m
    hours_to_next_tide: float = 3.0  # 距下一潮汐时间（小时）

    # 用户反馈
    feedback: Literal["爆护", "好", "一般", "差", "空军"]
    feedback_score: int  # 0-100

    # 专家评分（计算得出）
    expert_score: float = 0.0

    # 元数据
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "fishing_records"
        indexes = [  # noqa: RUF012
            [("location_id", 1), ("fishing_time", -1)],
        ]


class FishingModelMeta(Document):
    """
    钓鱼指数模型元数据
    记录 sklearn 残差模型的训练状态
    """

    model_version: str = "v1.0"
    model_type: str = "Ridge"

    # 标准化参数
    scaler_mean: dict[str, float] = Field(default_factory=dict)
    scaler_std: dict[str, float] = Field(default_factory=dict)

    # Ridge 正则化参数
    alpha: float = 1.0

    # 特征名列表
    feature_names: list[str] = [  # noqa: RUF012
        "w1_temp",
        "w2_humidity",
        "w3_pressure",
        "w4_wind",
        "w5_rain",
        "w6_tide_rising",
        "w7_hours_to_tide",
        "w8_tide_range",
        "w9_wind_level",
    ]

    # 模型性能
    training_samples: int = 0
    r2_score: float = 0.0

    # 训练状态
    last_trained_at: datetime | None = None
    incremental_updates: int = 0

    class Settings:
        name = "fishing_model_meta"
