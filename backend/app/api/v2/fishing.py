"""
钓鱼指数 API 路由
"""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from redis.asyncio import Redis as AsyncRedis

from app.api.des.auth import manager
from app.api.des.des import fishing_service_dep, weather_service_dep
from app.api.des.redis import get_redis
from app.models.models import User
from app.schemas.response import APIResponse
from app.services.fishing_service import FishingService, fishing_service
from app.services.weather_service import WeatherService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fishing", tags=["fishing"])


class FishingIndexResponse(BaseModel):
    """钓鱼指数响应"""

    fishing_index: int = Field(..., description="钓鱼指数 0-100")
    expert_score: int = Field(..., description="专家评分")
    residual: float = Field(..., description="个性化校正量")
    level: Literal["爆护", "好", "一般", "差", "空军"] = Field(
        ..., description="钓鱼等级"
    )
    feature_breakdown: dict[str, float] = Field(
        default_factory=dict, description="各特征评分"
    )
    # enriched 模式下附加的天气数据
    current_weather: dict | None = Field(
        default=None, description="当前天气（enriched=True 时填充）"
    )
    forecasts: list[dict] | None = Field(
        default=None, description="天气预报列表（enriched=True 时填充）"
    )
    location_name: str | None = Field(
        default=None, description="位置名称（enriched=True 时填充）"
    )
    tide_data: dict | None = Field(
        default=None, description="潮汐数据（enriched=True 时填充）"
    )


class FishingFeedbackRequest(BaseModel):
    """钓鱼反馈请求"""

    location_id: str = Field(..., description="钓点ID")
    location_name: str = Field(..., description="钓点名称")
    fishing_time: str = Field(..., description="钓鱼时间")

    # 天气数据
    temperature: float = Field(20.0, description="温度 °C")
    humidity: float = Field(50.0, description="湿度 %")
    pressure: float = Field(1013.0, description="气压 hPa")
    wind_speed: float = Field(0.0, description="风速 m/s")
    precipitation: float = Field(0.0, description="降水量 mm")
    indices: int = Field(2, description="和风指数 1-3")

    # 潮汐数据
    tide_level: float = Field(1.0, description="潮位 m")
    tide_type: Literal["涨潮", "退潮"] = Field("涨潮", description="高潮/低潮")
    tide_range: float = Field(1.5, description="潮差 m")
    hours_to_next_tide: float = Field(
        3.0, description="距下一潮汐时间（小时）"
    )

    # 反馈
    feedback: Literal["爆护", "好", "一般", "差", "空军"] = Field(
        ..., description="钓鱼体验"
    )


class FishingFeedbackResponse(BaseModel):
    """钓鱼反馈响应"""

    success: bool
    record_id: str
    expert_score: int
    residual: int


# 反馈分数映射
FEEDBACK_SCORES = {
    "爆护": 100,
    "好": 75,
    "一般": 50,
    "差": 25,
    "空军": 0,
}


def _build_record_from_request(req: FishingFeedbackRequest) -> dict:
    """从请求构建钓鱼记录"""
    return {
        "temperature": req.temperature,
        "humidity": req.humidity,
        "pressure": req.pressure,
        "wind_speed": req.wind_speed,
        "precipitation": req.precipitation,
        "tide_type": req.tide_type,
        "hours_to_tide": req.hours_to_next_tide,
        "tide_range": req.tide_range,
        "indices": req.indices,
    }


@router.get("/index")
async def get_fishing_index(
    location: str = Query(..., description="经纬度坐标，格式为 'lng,lat'"),
    enriched: bool = Query(False, description="是否附加天气数据"),
    redis: AsyncRedis = Depends(get_redis),
    weather_svc: WeatherService = Depends(weather_service_dep),
) -> JSONResponse:
    """
    获取指定地点的钓鱼指数

    基于专家公式计算基础分数 + sklearn 个性化校正
    当 enriched=True 时，响应中附加天气数据（当前天气/预报/位置名/潮汐）
    """
    logger.info(
        f"[钓鱼指数] 收到请求 location={location}, enriched={enriched}"
    )
    try:
        weather_data = await weather_svc.get_full_weather_data(location, redis)
        logger.info(
            f"[钓鱼指数] 获取天气数据成功: {list(weather_data.keys())}"
        )
    except Exception as e:
        logger.error(f"[钓鱼指数] 获取天气数据失败: {e}", exc_info=True)
        return APIResponse.error(message=f"无法获取天气数据，请稍后再试: {e}")

    # 解析潮汐数据
    tide_data = weather_data.get("tide", {})
    tide_info = fishing_service.parse_tide_info(tide_data)

    # 获取和风指数
    indices = int(fishing_service.get_qweather_index(weather_data))

    # 构建钓鱼记录
    record = fishing_service.build_record(weather_data, tide_info, indices)

    # 计算钓鱼指数
    fishing_index, expert_score, residual, feature_breakdown = (
        fishing_service.calculate_fishing_index(record)
    )
    logger.info(
        f"[钓鱼指数] 计算完成: index={fishing_index}, expert={expert_score}, residual={residual}"
    )

    resp_data = FishingIndexResponse(
        fishing_index=fishing_index,
        expert_score=expert_score,
        residual=residual,
        level=fishing_service.get_level(fishing_index),
        feature_breakdown={
            k: round(v, 2) for k, v in feature_breakdown.items()
        },
    )

    # enriched 模式下附加天气数据
    if enriched:
        resp_data.current_weather = weather_data.get("current", {}).get("now")
        resp_data.forecasts = weather_data.get("daily", {}).get("daily")
        resp_data.location_name = weather_data.get("locationName")
        resp_data.tide_data = weather_data.get("tide")

    return APIResponse.ok(data=resp_data.model_dump())


@router.post("/feedback", response_model=FishingFeedbackResponse)
async def submit_feedback(
    payload: FishingFeedbackRequest,
    _: AsyncRedis = Depends(get_redis),
    service: FishingService = Depends(fishing_service_dep),
) -> JSONResponse:
    """
    提交钓鱼反馈

    用户提交反馈后，系统计算残差并保存到 MongoDB
    """
    # 构建记录
    record = _build_record_from_request(payload)

    # 计算专家评分
    expert_score = fishing_service.expert.calculate(**record)

    # 用户实际评分
    actual_score = FEEDBACK_SCORES[payload.feedback]

    # 计算残差
    residual = actual_score - expert_score

    # 保存到 MongoDB
    doc_data = {
        "location_id": payload.location_id,
        "location_name": payload.location_name,
        "fishing_time": payload.fishing_time,
        **record,
        "feedback": payload.feedback,
        "feedback_score": actual_score,
        "expert_score": expert_score,
    }
    record_id = await service.save_feedback(doc_data)
    logger.info(f"[钓鱼反馈] 已保存记录: {record_id}")

    # 自动训练检查（异步，不阻塞响应）
    await service.auto_train_if_needed()

    return APIResponse.ok(
        data=FishingFeedbackResponse(
            success=True,
            record_id=str(record_id),
            expert_score=int(expert_score),
            residual=int(residual),
        ).model_dump(),
        message=f"反馈已记录：{payload.feedback}",
    )


class AITrainingRequest(BaseModel):
    """AI训练数据请求"""

    location_id: str = Field(..., description="钓点ID")
    location_name: str = Field(..., description="钓点名称")
    fishing_time: str = Field(..., description="钓鱼时间")

    # 天气特征
    temperature: float = Field(20.0, description="温度 °C")
    humidity: float = Field(50.0, description="湿度 %")
    pressure: float = Field(1013.0, description="气压 hPa")
    wind_speed: float = Field(0.0, description="风速 m/s")
    precipitation: float = Field(0.0, description="降水量 mm")
    indices: int = Field(2, description="和风指数 1-3")

    # 潮汐特征
    tide_level: float = Field(1.0, description="潮位 m")
    tide_type: Literal["涨潮", "退潮"] = Field("涨潮", description="高潮/低潮")
    tide_range: float = Field(1.5, description="潮差 m")
    hours_to_next_tide: float = Field(
        3.0, description="距下一潮汐时间（小时）"
    )

    # AI 评分
    ai_expert_score: int = Field(..., description="AI 给的专家基准分")
    ai_final_score: int = Field(..., description="AI 给的最终钓鱼指数")


class AITrainingResponse(BaseModel):
    """AI训练响应"""

    success: bool
    record_id: str
    expert_score: int
    ai_score: int
    residual: float
    training_triggered: bool
    training_result: dict | None


def _build_ai_record_from_request(req: AITrainingRequest) -> dict:
    """从 AI 请求构建钓鱼记录"""
    return {
        "temperature": req.temperature,
        "humidity": req.humidity,
        "pressure": req.pressure,
        "wind_speed": req.wind_speed,
        "precipitation": req.precipitation,
        "tide_type": req.tide_type,
        "hours_to_next_tide": req.hours_to_next_tide,
        "tide_range": req.tide_range,
        "indices": req.indices,
    }


@router.post("/train-from-ai", response_model=AITrainingResponse)
async def train_from_ai_scores(
    payload: AITrainingRequest,
    _: AsyncRedis = Depends(get_redis),
    service: FishingService = Depends(fishing_service_dep),
) -> JSONResponse:
    """
    使用 AI 评分自动训练模型

    无需用户反馈，直接用 AI 天气分析返回的评分作为训练数据
    """
    # 构建记录
    record = _build_ai_record_from_request(payload)

    # 计算本地专家评分（用于对比）
    local_expert_score = fishing_service.expert.calculate(**record)

    # AI 评分作为 actual_score
    ai_score = payload.ai_final_score

    # 计算残差
    residual = ai_score - local_expert_score

    # 保存到 MongoDB
    doc_data = {
        "location_id": payload.location_id,
        "location_name": payload.location_name,
        "fishing_time": payload.fishing_time,
        **record,
        "tide_level": payload.tide_level,
        "feedback": service.get_level(ai_score),
        "feedback_score": ai_score,
        "expert_score": local_expert_score,
        "source": "ai",
    }
    record_id = await service.save_feedback(doc_data)
    logger.info(f"[AI训练] 已保存记录: {record_id}, ai_score={ai_score}")

    # 自动训练检查
    training_result = await service.auto_train_if_needed()

    return APIResponse.ok(
        data=AITrainingResponse(
            success=True,
            record_id=str(record_id),
            expert_score=int(local_expert_score),
            ai_score=ai_score,
            residual=round(residual, 1),
            training_triggered=training_result is not None,
            training_result=training_result,
        ).model_dump(),
        message="AI训练数据已记录",
    )


@router.get("/weights")
async def get_weights(
    _: User = Depends(manager),
) -> APIResponse:
    """
    查看模型权重

    返回专家权重和 sklearn 残差模型权重
    """
    expert_weights = fishing_service.expert.WEIGHTS
    residual_weights = fishing_service.model_svc.get_weights()

    return APIResponse(
        status="success",
        data={
            "expert_weights": expert_weights,
            "residual_weights": residual_weights,
        },
    )
