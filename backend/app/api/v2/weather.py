"""天气 API v2 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from redis.asyncio import Redis as AsyncRedis

from app.api.des.des import weather_service_dep
from app.api.des.redis import get_redis
from app.schemas.response import APIResponse
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/tide")
async def get_qweather_tide(
    date: str = Query(..., description="日期，格式为 YYYYMMDD"),
    harbor: str = Query("P2352", description="港口代码"),
    redis: AsyncRedis = Depends(get_redis),
    weather_svc: WeatherService = Depends(weather_service_dep),
) -> JSONResponse:
    """获取潮汐数据。"""
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


@router.get("/full")
async def get_full_weather_data(
    location: str = Query(
        ..., description="经纬度坐标，格式为 'lng,lat'，保留两位小数"
    ),
    redis: AsyncRedis = Depends(get_redis),
    weather_svc: WeatherService = Depends(weather_service_dep),
) -> JSONResponse:
    """通过经纬度坐标获取完整的天气数据。"""
    raw_data = await weather_svc.get_full_weather_data(
        location=location, redis=redis
    )
    return APIResponse.ok(
        data=raw_data,
        message="Full weather data retrieved successfully",
    )
