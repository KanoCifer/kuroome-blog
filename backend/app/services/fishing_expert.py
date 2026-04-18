"""
专家规则评分公式
基于天气、潮汐特征计算钓鱼指数
"""

from __future__ import annotations

import numpy as np


class FishingExpertScorer:
    """
    专家规则钓鱼评分器

    公式: Expert_score = 0.2*w1 + 0.1*w2 + 0.1*w3 + 0.1*w4 + 0.05*w5 + 0.2*w6 + 0.2*w7 + 0.1*w8 + 0.1*w9
    """

    # 权重配置
    WEIGHTS = {  # noqa: RUF012
        "w1": 0.2,  # 温度
        "w2": 0.1,  # 湿度
        "w3": 0.1,  # 气压
        "w4": 0.1,  # 风速
        "w5": 0.05,  # 降雨
        "w6": 0.2,  # 涨潮
        "w7": 0.2,  # 距低潮时间
        "w8": 0.1,  # 潮差
        "w9": 0.1,  # 和风指数
    }

    @staticmethod
    def score_temperature(temp: float) -> float:
        """
        w1 温度评分: 20-28°C = 1分, 否则按偏离扣分
        """
        if 20 <= temp <= 28:
            return 1.0
        elif temp < 20:
            # 每降低1°C扣0.05分
            return np.amax([0.0, 1.0 - (20 - temp) * 0.05])
        else:
            # 每升高1°C扣0.05分
            return np.amax([0.0, 1.0 - (temp - 28) * 0.05])

    @staticmethod
    def score_humidity(humidity: float) -> float:
        """
        w2 湿度评分: 85% = 1分, 偏离扣分
        """
        if humidity == 85:
            return 1.0
        diff = abs(humidity - 85)
        return np.amax([0.0, 1.0 - diff * 0.02])

    @staticmethod
    def score_pressure(pressure: float) -> float:
        """
        w3 气压评分: 高压高分
        f_pressure = (pressure - 1000) / 25
        """
        f_pressure: float = (pressure - 1000) / 25
        return np.clip(f_pressure, 0, 2)  # 限制在0-2范围

    @staticmethod
    def score_wind(wind_speed: float) -> float:
        """
        w4 风速评分: 过大扣分，>3m/s扣1分
        """
        if wind_speed <= 3:
            return 1.0
        else:
            # 每超过3m/s 1m/s扣0.33分
            return np.amax([0.0, 1.0 - (wind_speed - 3) * 0.33])

    @staticmethod
    def score_rain(precipitation: float) -> float:
        """
        w5 降雨评分: 降雨扣分
        无雨=1, 小雨扣0.5, 中雨+扣1
        """
        if precipitation == 0:
            return 1.0
        elif precipitation < 2.5:  # 小雨
            return 0.5
        else:  # 中雨及以上
            return 0.0

    @staticmethod
    def score_tide_rising(tide_type: str) -> float:
        """
        w6 是否涨潮: 涨潮=1, 退潮=0
        """
        return 1.0 if tide_type == "涨潮" else 0.0

    @staticmethod
    def score_hours_to_tide(hours: float) -> float:
        """
        w7 距低潮时间: 线性衰减
        0h=1分, 3h=0.5分, 6h=0分
        """
        if hours <= 0:
            return 1.0
        elif hours >= 6:
            return 0.0
        else:
            # 线性衰减: (6 - hours) / 6
            return (6 - hours) / 6

    @staticmethod
    def score_tide_range(tide_range: float) -> float:
        """
        w8 高低潮差: 越大越高分
        假设最佳潮差2-3m为满分1分
        """
        if tide_range >= 2.5:
            return 1.0
        elif tide_range < 0.5:
            return 0.3
        else:
            # 线性映射: 0.5m->0.3, 2.5m->1.0
            return 0.3 + (tide_range - 0.5) * (0.7 / 2.0)

    @staticmethod
    def score_wind_level(wind_level: int) -> float:
        """
        w9 和风钓鱼指数: 适宜(1)->1.0, 较适宜(2)->0.5, 不宜(3)->0.0
        """
        mapping = {1: 1.0, 2: 0.5, 3: 0.0}
        return mapping.get(wind_level, 0.5)

    def calculate(
        self,
        temperature: float,
        humidity: float,
        pressure: float,
        wind_speed: float,
        precipitation: float,
        tide_type: str,
        hours_to_tide: float,
        tide_range: float,
        wind_level: int,
    ) -> float:
        """
        计算专家评分

        Args:
            temperature: 温度 °C
            humidity: 湿度 %
            pressure: 气压 hPa
            wind_speed: 风速 m/s
            precipitation: 降水量 mm
            tide_type: "涨潮" | "退潮" | "平潮"
            hours_to_tide: 距低潮时间（小时）
            tide_range: 潮差 m
            wind_level: 和风指数 1-3

        Returns:
            专家评分 0-100
        """
        w1 = self.score_temperature(temperature)
        w2 = self.score_humidity(humidity)
        w3 = self.score_pressure(pressure)
        w4 = self.score_wind(wind_speed)
        w5 = self.score_rain(precipitation)
        w6 = self.score_tide_rising(tide_type)
        w7 = self.score_hours_to_tide(hours_to_tide)
        w8 = self.score_tide_range(tide_range)
        w9 = self.score_wind_level(wind_level)

        raw_score = (
            self.WEIGHTS["w1"] * w1
            + self.WEIGHTS["w2"] * w2
            + self.WEIGHTS["w3"] * w3
            + self.WEIGHTS["w4"] * w4
            + self.WEIGHTS["w5"] * w5
            + self.WEIGHTS["w6"] * w6
            + self.WEIGHTS["w7"] * w7
            + self.WEIGHTS["w8"] * w8
            + self.WEIGHTS["w9"] * w9
        )

        # 转换为0-100
        return np.clip(raw_score * 100, 0, 100)

    def get_feature_scores(
        self,
        temperature: float,
        humidity: float,
        pressure: float,
        wind_speed: float,
        precipitation: float,
        tide_type: str,
        hours_to_tide: float,
        tide_range: float,
        wind_level: int,
    ) -> dict[str, float]:
        """
        获取各特征评分详情（用于调试和展示）
        """
        return {
            "w1_temp": self.score_temperature(temperature),
            "w2_humidity": self.score_humidity(humidity),
            "w3_pressure": self.score_pressure(pressure),
            "w4_wind": self.score_wind(wind_speed),
            "w5_rain": self.score_rain(precipitation),
            "w6_tide_rising": self.score_tide_rising(tide_type),
            "w7_hours_to_tide": self.score_hours_to_tide(hours_to_tide),
            "w8_tide_range": self.score_tide_range(tide_range),
            "w9_wind_level": self.score_wind_level(wind_level),
        }


# 全局实例
fishing_expert = FishingExpertScorer()
