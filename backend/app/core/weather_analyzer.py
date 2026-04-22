"""天气分析 AI 代理"""

from __future__ import annotations

from collections.abc import AsyncIterator
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
    windDir: str | None = Field(default=None, description="风向文字")  # noqa: N815
    windSpeed: str | None = Field(default=None, description="风速（km/h）")  # noqa: N815
    humidity: int | None = Field(default=None, description="湿度（%）")
    pressure: float | None = Field(default=None, description="气压（hPa）")
    precip: float | None = Field(default=None, description="降水量（mm）")


class TideEventInput(BaseModel):
    """潮汐事件（高低潮）"""

    type: Literal["H", "L"] = Field(..., description="H=高潮，L=低潮")
    fxTime: str = Field(..., description="发生时间")  # noqa: N815
    height: float = Field(..., description="潮高（m）")


class TideHourlyInput(BaseModel):
    """逐时潮高"""

    fxTime: str = Field(..., description="时间")  # noqa: N815
    height: str = Field(..., description="潮高（m）")


class TideDataInput(BaseModel):
    """潮汐数据"""

    updateTime: str | None = Field(default=None, description="更新时间")  # noqa: N815
    tideTable: list[TideEventInput] = Field(  # noqa: N815
        default_factory=list, description="高低潮时刻表"
    )
    tideHourly: list[TideHourlyInput] = Field(  # noqa: N815
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
    _SYSTEM_PROMPT = (
        "你是一名专业的垂钓气象与潮汐分析师，擅长综合天气和潮汐数据判断钓鱼条件。\n\n"
        "## 分析维度\n"
        "依次评估以下因素对钓鱼的影响：\n"
        "- **温度**：鱼类活跃度随水温变化，15-25°C 通常最佳\n"
        "- **风速风向**：微风（3-15 km/h）有利于钓鱼；强风（>30 km/h）危险\n"
        "- **气压**：高气压稳定（>1013 hPa）适合钓鱼；气压骤降时鱼口差\n"
        "- **降水**：小雨可提升鱼口；暴雨/雷暴禁止出钓\n"
        "- **潮汐**：涨潮前后 1-2 小时（尤其高潮前）通常是最佳钓鱼窗口；\n"
        "  大潮差（高低潮落差 >2m）水流湍急，鱼不易开口；\n"
        "  平潮期（高/低潮后 30 分钟内）水流缓，适合底钓\n"
        "- **云量/光照**：阴天或多云通常优于正午烈日\n\n"
        "## 输出格式（严格遵守）\n"
        "## 钓鱼指数：XX / 100\n\n"
        "**出钓建议**：一句话概括（极佳 / 良好 / 一般 / 不宜 / 禁止）\n\n"
        "### 逐项分析\n"
        "| 维度 | 当前状况 | 影响评估 |\n"
        "|------|----------|----------|\n"
        "| 温度 | ... | ... |\n"
        "| 风况 | ... | ... |\n"
        "| 气压 | ... | ... |\n"
        "| 降水 | ... | ... |\n"
        "| 潮汐 | ... | ... |\n\n"
        "### 最佳出钓窗口\n"
        "根据潮汐表，今日推荐时段：HH:MM - HH:MM（说明原因）\n\n"
        "### 建议\n"
        "- 出钓建议（时段/钓点/装备）\n"
        "- 注意事项或安全提示\n\n"
        "## 评分规则\n"
        "- 先按专家权重计算基准分（归一化权重，总和=1）：\n"
        "  w1_temp=4/23, w2_humidity=2/23, w3_pressure=2/23, w4_wind=2/23,\n"
        "  w5_rain=1/23, w6_tide_rising=4/23, w7_hours_to_tide=4/23,\n"
        "  w8_tide_range=2/23, w9_indices=2/23\n"
        "- Expert_score = Σ(weight_i * feature_score_i) * 100，feature_score_i 范围 [0,1]，但 pressure 特征可达 [0,2]\n"
        "- 再给出 AI 自主修正分（-20~20），并说明修正依据（短时天气波动、天气现象、潮汐时序）\n"
        "- 最终钓鱼指数 = clip(专家基准分 + AI 自主修正分, 0, 100)\n"
        "- 90-100：极佳，强烈推荐\n"
        "- 70-89：良好，适合出钓\n"
        "- 50-69：一般，可以尝试但体验有限\n"
        "- 30-49：不宜，不建议出钓\n"
        "- 0-29：禁止，存在安全风险\n\n"
        "输出时必须显式给出：专家基准分、AI 自主修正分、最终钓鱼指数。\n"
        "若遇雷暴、台风或暴雨，评分直接置 0 并给出安全警告。\n"
        "回答简洁，避免重复原始数据，聚焦分析与建议。"
    )
    DB = RedisDb(db_url=settings.REDIS_URL)

    def __init__(self) -> None:
        from agno.models.openai.like import OpenAILike
        from agno.tools.websearch import WebSearchTools

        self._model = OpenAILike(
            id="Ling-2.6-1T",
            api_key=settings.API_KEY,
            base_url="https://api.tbox.cn/api/llm/v1",
            temperature=1,
            timeout=30,
        )

        self._agent = Agent(
            model=self._model,
            instructions=self._SYSTEM_PROMPT,
            db=WeatherAnalyzer.DB,
            tools=[WebSearchTools(backend="bing")],
            add_history_to_context=True,
            num_history_runs=5,
            input_schema=WeatherAnalysisInputSchema,
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
        self, weather_data: WeatherAnalysisInput
    ) -> AsyncIterator[str]:
        """流式分析天气数据，返回结构化 JSON 字符串片段"""
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        try:
            input_schema = self._build_input_schema(weather_data)
            # logger.info(f"Constructed input schema: {input_schema}")
        except Exception:
            logger.exception("构建 input_schema 失败")
            raise

        try:
            response = self._agent.arun(input_schema, stream=True)
        except Exception:
            logger.exception("Agent 运行失败")
            raise

        # json_buffer = ""
        async for event in response:
            if isinstance(event, RunOutputEvent) and event.content:
                # json_buffer += str(event.content)
                # logger.info(f"Received chunk: {event!r}")
                yield str(event.content)

        # 流结束后校验并解析为 Pydantic
        # try:
        #     result = WeatherAnalysisResult.model_validate_json(json_buffer)
        #     logger.info(f"结构化验证成功: final_score={result.final_score}")
        # except Exception:
        #     logger.exception("JSON 解析失败，将返回原始文本")


weather_analyzer = WeatherAnalyzer()
