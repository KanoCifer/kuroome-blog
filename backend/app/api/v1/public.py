"""Public API router for ReadingList.

This module provides public endpoints that do not require authentication:
- API status checks
- robots.txt and sitemap.xml for SEO
- Media file serving
- Amap security key proxy
"""

from __future__ import annotations

from fastapi import APIRouter, Body, Depends, File, Request, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse
from redis.asyncio import Redis as AsyncRedis
from starlette import status
from starlette.responses import StreamingResponse

from app.api.des.auth import manager
from app.api.des.db import get_async_session
from app.api.des.des import public_service_dep
from app.api.des.limiter import limiter
from app.api.des.redis import get_redis
from app.core.config import get_settings
from app.models.models import User
from app.schemas.aiagent import WeatherAnalysisInput
from app.schemas.gallery import GalleryInput
from app.schemas.response import APIResponse
from app.services.public_service import PublicService
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


@router.get("/status-detail")
async def get_status_detail(
    public_service: PublicService = Depends(public_service_dep),
) -> JSONResponse:
    """Public status detail endpoint for the status page.

    Returns version info, service metrics, and system info.
    No authentication required.
    """
    async with get_async_session() as session:
        data = await public_service.get_status_detail(session)

    return APIResponse.ok(
        data=data,
        message="Status detail retrieved successfully",
    )


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
async def get_amap_security_key(request: Request) -> JSONResponse:
    """获取高德地图安全密钥，用于前端调用高德地图相关接口时的安全验证。

    该接口暴露给客户端是安全的，因为：
    1. 高德 JS API 的 securityJsCode 是绑定域名的标识符，不是私密密钥
    2. 真正的密钥是 Web Key（后端持有），用于服务端 API 调用
    3. 已配置来源验证，限制只有合法前端才能获取
    """
    # 验证请求来源
    origin = request.headers.get("origin") or request.headers.get(
        "referer", ""
    )
    allowed_origins = get_settings().AMAP_KEY_ALLOWED_ORIGINS.split(",")
    if origin and not any(o in origin for o in allowed_origins):
        return APIResponse.error(
            message="Forbidden: invalid origin",
            code=403,
        )

    encoded_key = PublicService.get_amap_security_key()

    return APIResponse.ok(data={"securityJsCode": encoded_key})


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
    param model_id: AI 模型 ID，默认使用配置中的模型。
    """
    event_generator = public_service.analyze_weather(
        weather_data, model_id=weather_data.model_id
    )
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
    except Exception as exc:
        return APIResponse.error(
            message=f"Failed to retrieve picture gallery: {exc!s}",
            code=500,
        )
