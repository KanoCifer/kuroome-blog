"""Public API router for ReadingList.

This module provides public endpoints that do not require authentication:
- API status checks
- robots.txt and sitemap.xml for SEO
- Media file serving
- Amap security key proxy
"""

from __future__ import annotations

import datetime

from fastapi import APIRouter, Body, Depends, File, Query, Request, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse
from redis.asyncio import Redis as AsyncRedis
from starlette import status
from starlette.responses import StreamingResponse

from app.api.des.auth import manager
from app.api.des.des import public_service_dep
from app.api.des.limiter import limiter
from app.api.des.redis import get_redis
from app.models.models import User
from app.schemas.aiagent import WeatherAnalysisInput
from app.schemas.gallery import GalleryInput
from app.schemas.response import APIResponse
from app.services.public_service import PublicDomainError, PublicService
from app.utils.media import save_upload_image

router = APIRouter(tags=["public"])


@router.get("/status")
async def get_api_status(
    public_service: PublicService = Depends(public_service_dep),
) -> APIResponse:
    """Get API status.

    Returns:
        APIResponse: API running status

    Example:
        {
            "status": "success",
            "message": "API is running",
            "data": {"status": "ok"}
        }
    """

    response = APIResponse(
        status="success",
        data=public_service.get_api_status(),
        message="API is running",
    )

    # Cache for 60 seconds

    return response


@router.get("/robots.txt", response_class=PlainTextResponse)
async def get_robots_txt(
    public_service: PublicService = Depends(public_service_dep),
) -> PlainTextResponse:
    """Return robots.txt file for search engines.

    Tells search engines which pages can be crawled.

    Returns:
        PlainTextResponse: robots.txt content
    """

    robots_content = public_service.get_robots_txt()

    # Cache for 3600 seconds (1 hour)

    return PlainTextResponse(
        content=robots_content,
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/sitemap.xml")
async def get_sitemap_xml(
    public_service: PublicService = Depends(public_service_dep),
) -> PlainTextResponse:
    """Generate and return sitemap.xml for SEO.

    Helps search engines better crawl the website.

    Returns:
        PlainTextResponse: sitemap.xml content
    """
    xml_content = await public_service.build_sitemap_xml()

    # Cache for 3600 seconds (1 hour)

    return PlainTextResponse(
        content=xml_content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.post("/like")
@limiter.limit("25/day")
async def add_like(
    request: Request,
    redis: AsyncRedis = Depends(get_redis),
    likes_count: int = Body(
        ..., gt=0, embed=True, description="Number of likes to add"
    ),
) -> JSONResponse:
    """Add a like to the site.

    Returns:
        JSONResponse: Current total likes count
    """
    total = await PublicService.add_like(redis, likes_count)

    return APIResponse.ok(
        data={"likes_count": total},
        message="Like added successfully",
    )


@router.get("/likes")
async def get_likes(
    redis: AsyncRedis = Depends(get_redis),
) -> JSONResponse:
    """Get total likes count.

    Returns:
        JSONResponse: Current total likes count
    """
    total_likes = await PublicService.get_likes(redis)

    return APIResponse.ok(
        data={"likes_count": total_likes},
        message="Likes count retrieved successfully",
    )


@router.get("/amap/security-key")
@limiter.limit("10/hour")
async def get_amap_security_key(request: Request) -> JSONResponse:
    """Get Amap security key for frontend map integration.

    Returns the securityJsCode needed for Amap API initialization.
    The key is base64 encoded to prevent plain text exposure in network responses.
    Rate limited to prevent abuse.

    Security notes:
    - Key is base64 encoded (obfuscation, not encryption)
    - Rate limited to 10 requests/hour
    - Use Amap console to restrict domains/IPs
    - Consider rotating keys periodically

    Returns:
        JSONResponse: Amap security configuration with encoded key
    """
    encoded_key = PublicService.get_amap_security_key()

    return APIResponse.ok(data={"securityJsCode": encoded_key})


@router.post("/weather")
@limiter.limit("100/hour")
async def get_weather(
    request: Request,
    city: str = Body(..., description="City adcode"),
    extensions: str = Body("base", description="Weather type: base/all"),
    redis: AsyncRedis = Depends(get_redis),
) -> JSONResponse:
    """高德天气接口代理，获取当前天气或天气预报。（已废弃，使用 /weather/now 和 /weather/{days} 替代）"""
    data, from_cache = await PublicService.get_weather(
        redis=redis,
        city=city,
        extensions=extensions,
    )

    # Pass through Amap fields as-is; frontend LiveWeather/ForecastDay types expect
    # the original Amap field names (temperature, weather, winddirection, dayweather, etc.)
    if extensions == "base" and "lives" in data:
        data["lives"] = [
            {
                "province": item.get("province", ""),
                "city": item.get("city", ""),
                "adcode": item.get("adcode", ""),
                "weather": item.get("weather", ""),
                "temperature": item.get("temperature", ""),
                "winddirection": item.get("winddirection", ""),
                "windpower": item.get("windpower", ""),
                "humidity": item.get("humidity", ""),
                "reporttime": item.get("reporttime", ""),
            }
            for item in data.get("lives", [])
        ]
    elif extensions == "all" and "forecasts" in data:
        data["forecasts"] = [
            {
                "casts": [
                    {
                        "date": cast.get("date", ""),
                        "week": cast.get("week", ""),
                        "dayweather": cast.get("dayweather", ""),
                        "nightweather": cast.get("nightweather", ""),
                        "daytemp": cast.get("daytemp", ""),
                        "nighttemp": cast.get("nighttemp", ""),
                        "daywind": cast.get("daywind", ""),
                        "nightwind": cast.get("nightwind", ""),
                        "daypower": cast.get("daypower", ""),
                        "nightpower": cast.get("nightpower", ""),
                    }
                    for cast in forecast.get("casts", [])
                ]
            }
            for forecast in data.get("forecasts", [])
        ]

    if from_cache:
        return APIResponse.ok(
            data=data,
            message="Weather information retrieved from cache",
        )

    return APIResponse.ok(data=data)


@router.post("/geocode/regeo")
@limiter.limit("100/hour")
async def reverse_geocode(
    request: Request,
    location: str = Body(..., description="Location coordinates: lng,lat"),
    extensions: str = Body("base", description="Extensions type"),
) -> JSONResponse:
    """逆地理编码接口代理，根据经纬度坐标获取地址信息和兴趣点信息。
    已废弃，使用 /geo/v2/poi/lookup 替代。
    """
    data = await PublicService.reverse_geocode(location, extensions)

    return APIResponse.ok(
        data=data,
        message="Reverse geocode completed successfully",
    )


@router.get("/qweather/tide")
@limiter.limit("100/hour")
async def get_qweather(
    request: Request,
    date: str = Query(
        datetime.datetime.now().strftime("%Y%m%d"),
        description="Date for tide information in YYYYMMDD format",
    ),
    harbor: str = Query(
        "P2352", description="Harbor code for tide information"
    ),
    redis: AsyncRedis = Depends(get_redis),
) -> JSONResponse:
    """Get weather information from QWeather API."""
    try:
        data, from_cache = await PublicService.get_qweather_tide(
            redis=redis, harbor=harbor, date=date
        )
        if from_cache:
            return APIResponse.ok(
                data=data,
                message="QWeather information retrieved from cache",
            )

        return APIResponse.ok(
            data=data,
            message="QWeather information retrieved successfully",
        )
    except PublicDomainError as exc:
        return APIResponse.error(
            message=exc.message,
            code=exc.code,
        )
    except Exception as e:
        return APIResponse.error(
            message=f"Internal server error: {e!s}",
            code=500,
        )


@router.get("/qweather/location")
@limiter.limit("100/hour")
async def get_qweather_location(
    request: Request,
    location: str,
    type: str = "scenic",
    public_service: PublicService = Depends(public_service_dep),
    redis: AsyncRedis = Depends(get_redis),
) -> JSONResponse:
    """通过经纬度坐标获取兴趣点信息。已废弃，使用 /geo/v2/poi/lookup 替代。

    Args:
        location: 经纬度坐标，格式为 "lng,lat"保留两位小数
        type: 兴趣点类型，"scenic" "TSTA"等
    """
    try:
        data = await public_service.get_qweather_location(
            location=location, type_=type, redis=redis
        )

        return APIResponse.ok(
            data=data,
            message="QWeather location information retrieved successfully",
        )
    except PublicDomainError as e:
        return APIResponse.error(
            message=e.message,
            code=e.code,
        )
    except Exception as e:
        return APIResponse.error(
            message=f"Internal server error: {e!s}",
            code=500,
        )


@router.post("/llm/weather-analysis")
@limiter.limit("50/hour")
async def analyze_weather(
    request: Request,
    weather_data: WeatherAnalysisInput = Body(
        ..., description="Weather data to analyze"
    ),
    public_service: PublicService = Depends(public_service_dep),
) -> StreamingResponse:
    """根据天气数据进行分析并生成报告。
    param weather_data: 需要分析的天气数据。
    """
    event_generator = public_service.analyze_weather(weather_data)
    return StreamingResponse(
        event_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/upload-gallery-image")
async def upload_blog_image(
    request: Request,
    file: UploadFile = File(),
    user: User = Depends(manager),
) -> JSONResponse:
    """Upload blog image and return public URL."""
    if not file or not file.filename:
        return APIResponse.error(
            message="No image provided.",
            code=status.HTTP_400_BAD_REQUEST,
        )
    relative_path = save_upload_image(file, f"gallery/{user.id}")

    return APIResponse.ok(
        data={
            "url": f"/api/v1/media/{relative_path}",
            "filename": relative_path,
        },
        message="Image uploaded successfully.",
        code=status.HTTP_200_OK,
    )


@router.post("/set-pic-gallery")
async def set_pic_gallery(
    redis: AsyncRedis = Depends(get_redis),
    images: GalleryInput = Body(..., description="List of image data to set"),
    public_service: PublicService = Depends(public_service_dep),
) -> JSONResponse:
    """Set picture gallery data."""
    try:
        await public_service.set_pic_gallery(
            redis=redis,
            images=images,
        )
        return APIResponse.ok(
            message="Picture gallery updated successfully",
        )
    except PublicDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        return APIResponse.error(
            message=f"Failed to update picture gallery: {exc!s}",
            code=500,
        )


@router.get("/pic-gallery")
async def get_pic_gallery(
    redis: AsyncRedis = Depends(get_redis),
    public_service: PublicService = Depends(public_service_dep),
):
    """从图像库中获取图片列表。"""
    try:
        images = await public_service.get_pic_gallery(redis=redis)
        return APIResponse.ok(
            data={"images": images},
            message="Picture gallery retrieved successfully",
        )
    except PublicDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)


@router.get("/weather/now")
async def get_current_weather(
    request: Request,
    location: str = Query(..., description="Location coordinates: lng,lat"),
    redis: AsyncRedis = Depends(get_redis),
    public_service: PublicService = Depends(public_service_dep),
) -> JSONResponse:
    """通过经纬度坐标获取当前的天气信息。"""
    try:
        data = await public_service.get_current_weather(
            location=location, redis=redis
        )
        return APIResponse.ok(
            data=data,
            message="Current weather retrieved successfully",
        )
    except PublicDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        return APIResponse.error(
            message=f"Failed to retrieve current weather: {exc!s}",
            code=500,
        )


@router.get("/geo/v2/poi/lookup")
async def get_poi_lookup(
    request: Request,
    location: str = Query(..., description="Location coordinates: lng,lat"),
    redis: AsyncRedis = Depends(get_redis),
    public_service: PublicService = Depends(public_service_dep),
) -> JSONResponse:
    """通过经纬度坐标获取兴趣点信息。"""
    try:
        data = await public_service.get_poi_lookup(
            location=location, redis=redis
        )
        return APIResponse.ok(
            data=data,
            message="POI information retrieved successfully",
        )
    except PublicDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        return APIResponse.error(
            message=f"Failed to retrieve POI information: {exc!s}",
            code=500,
        )


@router.get("/weather/{days}")
async def get_weather_by_days(
    request: Request,
    days: int,
    location: str = Query(..., description="Location coordinates: lng,lat"),
    redis: AsyncRedis = Depends(get_redis),
    public_service: PublicService = Depends(public_service_dep),
) -> JSONResponse:
    """
    通过经纬度坐标获取未来几天的天气预报信息。
    Args:
        location: 经纬度坐标，格式为 "lng,lat"保留两位小数
        days: 需要获取预报的天数，必须在1到14之间
    """

    try:
        data = await public_service.get_weather_forecast(
            location=location, days=days, redis=redis
        )
        return APIResponse.ok(
            data=data,
            message=f"{days}-day weather forecast retrieved successfully",
        )
    except PublicDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        return APIResponse.error(
            message=f"Failed to retrieve weather forecast: {exc!s}",
            code=500,
        )


@router.get("/weather/hourly/{hours}")
async def get_hourly_weather(
    request: Request,
    hours: int,
    location: str = Query(..., description="Location coordinates: lng,lat"),
    redis: AsyncRedis = Depends(get_redis),
    public_service: PublicService = Depends(public_service_dep),
) -> JSONResponse:
    """
    通过经纬度坐标获取未来几小时的天气预报信息。
    Args:
        location: 经纬度坐标，格式为 "lng,lat"保留两位小数
        hours: 需要获取预报的小时数，必须在1到24之间
    """

    try:
        data = await public_service.get_hourly_weather(
            location=location, hours=hours, redis=redis
        )
        return APIResponse.ok(
            data=data,
            message=f"{hours}-hour weather forecast retrieved successfully",
        )
    except PublicDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        return APIResponse.error(
            message=f"Failed to retrieve hourly weather forecast: {exc!s}",
            code=500,
        )


@router.get("/weather/full")
async def get_full_weather_data(
    request: Request,
    location: str = Query(..., description="Location coordinates: lng,lat"),
    redis: AsyncRedis = Depends(get_redis),
    public_service: PublicService = Depends(public_service_dep),
) -> JSONResponse:
    """通过经纬度坐标获取完整的天气数据。"""
    try:
        data = await public_service.get_full_weather_data(
            location=location, redis=redis
        )
        return APIResponse.ok(
            data=data,
            message="Full weather data retrieved successfully",
        )
    except PublicDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        return APIResponse.error(
            message=f"Failed to retrieve full weather data: {exc!s}",
            code=500,
        )
