"""
钓鱼指数纯计算模块
无状态，无 repo 依赖——所有函数都是确定性的数据转换
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass
class TideInfo:
    """潮汐信息"""

    tide_type: Literal["涨潮", "退潮"]
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


# 反馈分数映射
FEEDBACK_SCORES = {
    "爆护": 100,
    "好": 75,
    "一般": 50,
    "差": 25,
    "空军": 0,
}


def get_qweather_index(weather_data: dict) -> int:
    """提取天气数据中的和风指数"""
    indices = weather_data.get("indices", {})
    level = indices.get("daily", [])[0].get("level", 2)
    return int(level)


def parse_tide_info(tide_data: dict) -> TideInfo:
    """
    解析潮汐数据

    QWeather API 返回格式:
    {
        "tideTable": [
            {"fxTime": "2021-02-06T03:48+08:00", "height": "2.17", "type": "H"},
            {"fxTime": "2021-02-06T10:12+08:00", "height": "0.21", "type": "L"},
        ],
        "tideHourly": [...]
    }
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

    now = datetime.now(timezone(timedelta(hours=8)))

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

    if current_tide is None:
        current_tide = tide_table[0]
        next_tide = tide_table[1] if len(tide_table) > 1 else None

    tide_type = "涨潮" if current_tide.get("type", "H") == "H" else "退潮"
    tide_level = float(current_tide.get("height", 1.5))

    tide_range = 1.5
    if next_tide:
        next_level = float(next_tide.get("height", 1.5))
        tide_range = abs(next_level - tide_level)

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
    weather_data: dict,
    tide_info: TideInfo,
    indices: int = 2,
) -> FishingRecord:
    """从天气和潮汐数据构建钓鱼记录"""
    now = weather_data.get("current", {}).get("now", {})

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


def record_to_dict(record: FishingRecord) -> dict:
    """将 FishingRecord 转换为 dict（供专家评分和模型使用）"""
    return {
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


def get_level(
    index: float,
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
