"""天气分析 AI 代理"""

from __future__ import annotations

import re
from collections.abc import AsyncIterator, Callable
from typing import Literal

from agno.agent import Agent, RunOutputEvent
from agno.db.redis import RedisDb
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logger import logger
from app.schemas.aiagent import WeatherAnalysisInput


class FishingContextInput(BaseModel):
    """钓鱼指数上下文"""

    expert_score: float | None = Field(default=None, description="专家基准分")
    feature_breakdown: dict | None = Field(
        default=None, description="专家特征分解"
    )


class LiveWeatherInput(BaseModel):
    """实时天气数据"""

    temp: float | None = Field(default=None, description="气温（°C）")
    text: str | None = Field(default=None, description="天气文字描述")
    wind360: str | None = Field(default=None, description="风向角度")
    windDir: str | None = Field(default=None, description="风向文字")
    windSpeed: str | None = Field(default=None, description="风速（km/h）")
    humidity: int | None = Field(default=None, description="湿度（%）")
    pressure: float | None = Field(default=None, description="气压（hPa）")
    precip: float | None = Field(default=None, description="降水量（mm）")


class TideEventInput(BaseModel):
    """潮汐事件（高低潮）"""

    type: Literal["H", "L"] = Field(..., description="H=高潮，L=低潮")
    fxTime: str = Field(..., description="发生时间")
    height: float = Field(..., description="潮高（m）")


class TideHourlyInput(BaseModel):
    """逐时潮高"""

    fxTime: str = Field(..., description="时间")
    height: str = Field(..., description="潮高（m）")


class TideDataInput(BaseModel):
    """潮汐数据"""

    updateTime: str | None = Field(default=None, description="更新时间")
    tideTable: list[TideEventInput] = Field(
        default_factory=list, description="高低潮时刻表"
    )
    tideHourly: list[TideHourlyInput] = Field(
        default_factory=list, description="逐时潮高"
    )


class DayForecastInput(BaseModel):
    """单日天气预报"""

    date: str = Field(..., description="日期")
    day_temp: str = Field(..., description="白天温度（°C）")
    day_weather: str = Field(..., description="白天天气")
    day_wind: str = Field(..., description="白天风向")
    day_power: str = Field(..., description="白天风力")
    night_temp: str = Field(..., description="夜间温度（°C）")
    night_weather: str = Field(..., description="夜间天气")


class WeatherAnalysisInputSchema(BaseModel):
    """天气分析输入 Schema（Pydantic 格式化，替代字符串拼接）"""

    fishing_index: FishingContextInput | None = Field(
        default=None, description="钓鱼指数上下文"
    )
    live_weather: LiveWeatherInput | None = Field(
        default=None, description="实时天气"
    )
    forecasts: list[DayForecastInput] = Field(
        default_factory=list, description="天气预报"
    )
    tide_data: TideDataInput | None = Field(
        default=None, description="潮汐数据"
    )
    tide_spot_name: str | None = Field(
        default=None, description="最近的潮汐站点"
    )
    location_name: str | None = Field(
        default=None, description="用户位置，用于分析和输出建议"
    )


class WeatherAnalyzer:
    # 可用模型列表
    AVAILABLE_MODELS = {  # noqa: RUF012
        "Ling-2.6-1T": {
            "id": "Ling-2.6-1T",
            "base_url": "https://api.tbox.cn/api/llm/v1",
        },
        "Ling-2.6-flash": {
            "id": "Ling-2.6-flash",
            "base_url": "https://api.tbox.cn/api/llm/v1",
        },
        "Ring-2.5-1T": {
            "id": "Ring-2.5-1T",
            "base_url": "https://api.tbox.cn/api/llm/v1",
        },
    }
    DEFAULT_MODEL = "Ling-2.6-1T"

    _PROMPT_TEMPLATE = """
        你是一名专业的垂钓气象与潮汐分析师，擅长综合天气和潮汐数据判断钓鱼条件。
        ## 分析维度
        依次评估以下因素对钓鱼的影响：
        - **温度**：鱼类活跃度随水温变化，15-25°C 通常最佳
        - **风速风向**：微风（3-15 km/h）有利于钓鱼；强风（>30 km/h）危险
        - **气压**：高气压稳定（>1013 hPa）适合钓鱼；气压骤降时鱼口差
        - **降水**：小雨可提升鱼口；暴雨/雷暴禁止出钓
        - **潮汐**：涨潮前后 1-2 小时（尤其高潮前）通常是最佳钓鱼窗口；
          大潮差（高低潮落差 >2m）水流湍急，鱼不易开口；
          平潮期（高/低潮后 30 分钟内）水流缓，适合底钓
        - **云量/光照**：阴天或多云通常优于正午烈日



        ## 输出Markdown格式（严格遵守）
        ## 钓鱼指数：XX / 100
        **出钓建议**：一句话概括（极佳 / 良好 / 一般 / 不宜 / 禁止）
        ### 逐项分析
        | 维度 | 当前状况 | 影响评估 |
        |------|----------|----------|
        | 温度 | ... | ... |
        | 风况 | ... | ... |
        | 气压 | ... | ... |
        | 降水 | ... | ... |
        | 潮汐 | ... | ... |
        ### 最佳出钓窗口
        根据潮汐表，今日推荐时段：HH:MM - HH:MM（说明原因）
        ### 建议
        - 出钓建议（时段/钓点/装备）
        - 注意事项或安全提示


        ## 评分规则
        - 先按专家权重计算基准分（归一化权重，总和=1）：
          {weights_line}
        - Expert_score = Σ(weight_i * feature_score_i) * 100，feature_score_i 范围 [0,1]，但 pressure 特征可达 [0,2]
        - 再给出 AI 自主修正分（-20~20），并说明修正依据（短时天气波动、天气现象、潮汐时序）
        - 最终钓鱼指数 = clip(专家基准分 + AI 自主修正分, 0, 100)
        - 90-100：极佳，强烈推荐
        - 70-89：良好，适合出钓
        - 50-69：一般，可以尝试但体验有限
        - 30-49：不宜，不建议出钓
        - 0-29：禁止，存在安全风险
        输出时必须显式给出：专家基准分、AI 自主修正分、最终钓鱼指数。
        若遇雷暴、台风或暴雨，评分直接置 0 并给出安全警告。
        回答简洁清晰，避免重复原始数据，聚焦分析与建议
    """
    DB = RedisDb(db_url=settings.REDIS_URL)

    def __init__(
        self,
        expert_weights: dict[str, float] | None = None,
        parse_tide_info_fn: Callable | None = None,
    ) -> None:
        from agno.models.openai.like import OpenAILike
        from agno.tools.websearch import WebSearchTools

        self._parse_tide_info = parse_tide_info_fn

        # 权重名称映射，与 FishingExpertScorer.WEIGHTS 对齐
        weight_names = {
            "w1": "w1_temp",
            "w2": "w2_humidity",
            "w3": "w3_pressure",
            "w4": "w4_wind",
            "w5": "w5_rain",
            "w6": "w6_tide_rising",
            "w7": "w7_hours_to_tide",
            "w8": "w8_tide_range",
            "w9": "w9_indices",
        }
        weights = expert_weights or {
            "w1": 4 / 23,
            "w2": 2 / 23,
            "w3": 2 / 23,
            "w4": 2 / 23,
            "w5": 1 / 23,
            "w6": 4 / 23,
            "w7": 4 / 23,
            "w8": 2 / 23,
            "w9": 2 / 23,
        }
        weights_line = ", ".join(
            f"{weight_names.get(k, k)}={v:.4f}" for k, v in weights.items()
        )
        self._system_prompt = self._PROMPT_TEMPLATE.format(
            weights_line=weights_line
        )

        self._model = OpenAILike(
            id="Ling-2.6-1T",
            api_key=settings.API_KEY,
            base_url="https://api.tbox.cn/api/llm/v1",
            temperature=1,
            timeout=30,
        )

        self._agent = Agent(
            model=self._model,
            instructions=self._system_prompt,
            db=WeatherAnalyzer.DB,
            tools=[WebSearchTools(backend="bing")],
            add_history_to_context=True,
            num_history_runs=3,
            input_schema=WeatherAnalysisInputSchema,
            markdown=True,
        )

    def _build_input_schema(
        self, weather_data: WeatherAnalysisInput
    ) -> WeatherAnalysisInputSchema:
        """将 dict 格式的 weather_data 转换为类型化的 Pydantic 模型"""
        data = weather_data.weather_data

        fishing_ctx = data.get("fishingIndex")
        fishing_index = None
        if fishing_ctx:
            fishing_index = FishingContextInput(
                expert_score=fishing_ctx.get("expert_score"),
                feature_breakdown=fishing_ctx.get("feature_breakdown"),
            )

        live = data.get("liveWeather")
        live_weather = None
        if live:
            live_weather = LiveWeatherInput(
                temp=live.get("temp"),
                text=live.get("text"),
                wind360=live.get("wind360"),
                windSpeed=live.get("windSpeed"),
                windDir=live.get("windDir"),
                humidity=live.get("humidity"),
                pressure=live.get("pressure"),
                precip=live.get("precip"),
            )

        forecasts_raw = data.get("forecasts") or []
        forecasts = [
            DayForecastInput(
                date=f.get("date") or "",
                day_temp=f.get("daytemp") or "",
                day_weather=f.get("dayweather") or "",
                day_wind=f.get("daywind") or "",
                day_power=f.get("daypower") or "",
                night_temp=f.get("nighttemp") or "",
                night_weather=f.get("nightweather") or "",
            )
            for f in forecasts_raw[:3]
            if f and f.get("date")
        ]

        tide = data.get("tideData")
        tide_data = None
        if tide:
            tide_table = [
                TideEventInput(
                    type=t["type"],
                    fxTime=t.get("fxTime", ""),
                    height=float(t["height"]),
                )
                for t in tide.get("tideTable", [])
                if "height" in t
            ]
            tide_hourly = [
                TideHourlyInput(
                    fxTime=h.get("fxTime", ""), height=h.get("height", "")
                )
                for h in tide.get("tideHourly", [])
            ]
            tide_data = TideDataInput(
                updateTime=tide.get("updateTime"),
                tideTable=tide_table,
                tideHourly=tide_hourly,
            )

        return WeatherAnalysisInputSchema(
            fishing_index=fishing_index,
            live_weather=live_weather,
            forecasts=forecasts,
            tide_data=tide_data,
            location_name=data.get("locationName"),
            tide_spot_name=data.get("tideSpotName"),
        )

    async def analyze_weather_stream(
        self,
        weather_data: WeatherAnalysisInput,
        model_id: str | None = None,
        on_index_calculated: Callable | None = None,
    ) -> AsyncIterator[str]:
        """流式分析天气数据，返回结构化 JSON 字符串片段

        Args:
            on_index_calculated: 可选回调（sync 或 async），当提取到 AI 评分时调用。
                由调用方决定是否触发训练等副作用。
                签名: (weather_data_dict: dict, ai_score: int) -> None
        """
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        try:
            input_schema = self._build_input_schema(weather_data)
        except Exception:
            logger.exception("构建 input_schema 失败")
            raise

        # 根据 model_id 选择模型配置
        model_key = model_id or self.DEFAULT_MODEL
        model_config = self.AVAILABLE_MODELS.get(
            model_key,
            {
                "id": "Ling-2.6-1T",
                "base_url": "https://api.tbox.cn/api/llm/v1",
            },
        )

        from agno.models.openai.like import OpenAILike

        dynamic_model = OpenAILike(
            id=model_config["id"],
            api_key=settings.API_KEY,
            base_url=model_config["base_url"],
            temperature=1,
            timeout=30,
        )

        # 使用动态模型创建临时 agent
        from agno.tools.websearch import WebSearchTools

        dynamic_agent = Agent(
            model=dynamic_model,
            instructions=self._system_prompt,
            db=WeatherAnalyzer.DB,
            tools=[WebSearchTools(backend="bing")],
            input_schema=WeatherAnalysisInputSchema,
            markdown=True,
        )

        try:
            response = dynamic_agent.arun(input_schema, stream=True)
        except Exception:
            logger.exception("Agent 运行失败")
            raise

        buffer: str = ""
        async for event in response:
            if isinstance(event, RunOutputEvent) and event.content:
                buffer += event.content
                yield str(event.content)

        # 提取最终钓鱼指数
        index = None
        buffer = buffer.strip()
        logger.debug(f"Final agent output: {buffer!r}")
        try:
            match = re.search(
                r"(?:\*\*)?最终钓鱼指数(?:\*\*)?[：:]\s*(\d+)", string=buffer
            )
            if match:
                index = int(match.group(1))
                logger.debug(f"Extracted fishing index: {index}")
            else:
                logger.warning("未能提取到钓鱼指数")
        except Exception:
            logger.exception("提取钓鱼指数失败")

        # 通过回调通知调用方，由调用方决定训练等副作用
        if index is not None and on_index_calculated is not None:
            try:
                import asyncio

                result = on_index_calculated(weather_data.weather_data, index)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                logger.exception("on_index_calculated 回调失败")


def _create_weather_analyzer() -> WeatherAnalyzer:
    """创建全局 WeatherAnalyzer 实例，从 FishingExpertScorer 注入权重"""
    from app.services.fishing.fishing_expert import FishingExpertScorer
    from app.services.fishing.fishing_index import parse_tide_info

    return WeatherAnalyzer(
        expert_weights=FishingExpertScorer.WEIGHTS,
        parse_tide_info_fn=parse_tide_info,
    )


weather_analyzer = _create_weather_analyzer()
