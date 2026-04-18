"""
天气 API v2 路由
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from redis.asyncio import Redis as AsyncRedis

from app.api.des.des import weather_service_dep
from app.api.des.limiter import limiter
from app.api.des.redis import get_redis
from app.schemas.response import APIResponse
from app.services.weather_service import WeatherDomainError, WeatherService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/tide")
@limiter.limit("100/hour")
async def get_qweather_tide(
    date: str = Query(..., description="日期，格式为 YYYYMMDD"),
    harbor: str = Query("P2352", description="港口代码"),
    redis: AsyncRedis = Depends(get_redis),
    weather_svc: WeatherService = Depends(weather_service_dep),
) -> JSONResponse:
    """获取潮汐数据。"""
    try:
        data, from_cache = await weather_svc.get_qweather_tide(
            redis=redis, harbor=harbor, date=date
        )
        if from_cache:
            return APIResponse.ok(
                data=data,
                message="Tide information retrieved from cache",
            )
        return APIResponse.ok(
            data=data,
            message="Tide information retrieved successfully",
        )
    except WeatherDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        logger.error(f"[天气] 获取潮汐数据失败: {exc!s}", exc_info=True)
        return APIResponse.error(
            message=f"Failed to retrieve tide data: {exc!s}",
            code=500,
        )


@router.get("/full")
async def get_full_weather_data(
    location: str = Query(..., description="经纬度坐标，格式为 'lng,lat'"),
    redis: AsyncRedis = Depends(get_redis),
    weather_svc: WeatherService = Depends(weather_service_dep),
) -> JSONResponse:
    """通过经纬度坐标获取完整的天气数据。"""
    try:
        data = await weather_svc.get_full_weather_data(
            location=location, redis=redis
        )
        return APIResponse.ok(
            data=data,
            message="Full weather data retrieved successfully",
        )
    except WeatherDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        logger.error(f"[天气] 获取完整天气数据失败: {exc!s}", exc_info=True)
        return APIResponse.error(
            message=f"Failed to retrieve full weather data: {exc!s}",
            code=500,
        )
