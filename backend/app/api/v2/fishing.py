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
from app.api.des.des import fishing_service_dep, public_service_dep
from app.api.des.redis import get_redis
from app.models.models import User
from app.schemas.response import APIResponse
from app.services.fishing_service import FishingService, fishing_service
from app.services.public_service import PublicService

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
    indicate: int = Field(2, description="和风指数 1-3")

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
        "indicate": req.indicate,
    }


@router.get("/index")
async def get_fishing_index(
    location: str = Query(..., description="经纬度坐标，格式为 'lng,lat'"),
    redis: AsyncRedis = Depends(get_redis),
    public_svc: PublicService = Depends(public_service_dep),
) -> JSONResponse:
    """
    获取指定地点的钓鱼指数

    基于专家公式计算基础分数 + sklearn 个性化校正
    """
    logger.info(f"[钓鱼指数] 收到请求 location={location}")
    try:
        weather_data = await public_svc.get_full_weather_data(location, redis)
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
    indicate = int(fishing_service.get_qweather_index(weather_data))

    # 构建钓鱼记录
    record = fishing_service.build_record(weather_data, tide_info, indicate)

    # 计算钓鱼指数
    fishing_index, expert_score, residual, feature_breakdown = (
        fishing_service.calculate_fishing_index(record)
    )
    logger.info(
        f"[钓鱼指数] 计算完成: index={fishing_index}, expert={expert_score}, residual={residual}"
    )

    return APIResponse.ok(
        data=FishingIndexResponse(
            fishing_index=fishing_index,
            expert_score=expert_score,
            residual=residual,
            level=fishing_service.get_level(fishing_index),
            feature_breakdown={
                k: round(v, 2) for k, v in feature_breakdown.items()
            },
        ).model_dump(),
    )


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
