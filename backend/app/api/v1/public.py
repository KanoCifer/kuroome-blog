"""Public API router for ReadingList.

This module provides public endpoints that do not require authentication:
- API status checks
- robots.txt and sitemap.xml for SEO
- Media file serving
- Amap security key proxy
"""

from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import PlainTextResponse
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.api.des.appstate import get_app_state
from app.api.des.db import get_session
from app.api.des.limiter import limiter
from app.api.des.redis import get_redis
from app.appstate import AppState
from app.core.config import get_settings
from app.core.exceptions import APIError
from app.core.logger import logger
from app.core.response import APIResponse
from app.plugins.cache import redis_cache
from app.schemas.gallery import GalleryInput
from app.services.public_service import PublicService

router = APIRouter(tags=["public"])


async def _safe_invalidate(*func_names: str) -> None:
    """写后清理缓存。失败降级为日志,不影响主流程。"""
    try:
        await redis_cache.invalidate(*func_names)
    except Exception:
        logger.exception("cache invalidation failed (non-fatal)")


@router.get("/status")
@redis_cache(ttl=30, exclude=["state"])
async def get_api_status(
    state: AppState = Depends(get_app_state),
):
    """Get API status.

    Returns:
        ORJSONResponse: API running status

    Example:
        {
            "status": "success",
            "message": "API is running",
            "data": {"status": "ok"}
        }
    """

    return APIResponse(
        data=state.public_svc.get_api_status(),
        message="API is running",
    )


@router.get("/status-detail")
@redis_cache(ttl=60, exclude=["state", "session"])
async def get_status_detail(
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    """Public status detail endpoint for the status page.

    Returns version info, service metrics, and system info.
    No authentication required.
    """
    data = await state.public_svc.get_status_detail(session)

    return APIResponse(
        data=data,
        message="Status detail retrieved successfully",
    )


@router.get("/robots.txt", response_class=PlainTextResponse)
async def get_robots_txt(
    state: AppState = Depends(get_app_state),
) -> PlainTextResponse:
    """Return robots.txt file for search engines.

    Tells search engines which pages can be crawled.

    Returns:
        PlainTextResponse: robots.txt content
    """

    robots_content = state.public_svc.get_robots_txt()

    # Cache for 3600 seconds (1 hour)

    return PlainTextResponse(
        content=robots_content,
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/sitemap.xml")
async def get_sitemap_xml(
    state: AppState = Depends(get_app_state),
) -> PlainTextResponse:
    """Generate and return sitemap.xml for SEO.

    Helps search engines better crawl the website.

    Returns:
        PlainTextResponse: sitemap.xml content
    """
    xml_content = await state.public_svc.build_sitemap_xml()

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
) -> APIResponse:
    """Add a like to the site.

    Returns:
        APIResponse: Current total likes count
    """
    total = await PublicService.add_like(redis, likes_count)
    await _safe_invalidate("get_likes")

    return APIResponse(
        data={"likes_count": total},
        message="Like added successfully",
    )


@router.get("/likes")
@redis_cache(ttl=30, exclude=["redis"])
async def get_likes(
    redis: AsyncRedis = Depends(get_redis),
) -> APIResponse:
    """Get total likes count.

    Returns:
        APIResponse: Current total likes count
    """
    total_likes = await PublicService.get_likes(redis)

    return APIResponse(
        data={"likes_count": total_likes},
        message="Likes count retrieved successfully",
    )


@router.get("/amap/security-key")
async def get_amap_security_key(request: Request) -> APIResponse:
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
        raise APIError(
            message="Forbidden: invalid origin",
            code=403,
        )

    encoded_key = PublicService.get_amap_security_key()

    return APIResponse(data={"securityJsCode": encoded_key})


@router.post("/geocode/regeo")
@limiter.limit("100/hour")
async def reverse_geocode(
    request: Request,
    location: str = Body(..., description="Location coordinates: lng,lat"),
    extensions: str = Body("base", description="Extensions type"),
) -> APIResponse:
    """逆地理编码接口代理，根据经纬度坐标获取地址信息和兴趣点信息。
    已废弃，使用 /geo/v2/poi/lookup 替代。
    """
    data = await PublicService.reverse_geocode(location, extensions)

    return APIResponse(
        data=data,
        message="Reverse geocode completed successfully",
    )


@router.post("/set-pic-gallery")
async def set_pic_gallery(
    images: GalleryInput = Body(..., description="List of image data to set"),
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    """Set picture gallery data."""
    try:
        await state.public_svc.set_pic_gallery(session, images=images)
        await _safe_invalidate("get_pic_gallery")
        return APIResponse(
            message="Picture gallery updated successfully",
        )
    except Exception as exc:
        logger.error(f"Failed to update picture gallery: {exc!r}")
        raise APIError(
            message="Failed to update picture gallery",
            code=500,
        ) from exc


@router.get("/pic-gallery")
@redis_cache(ttl=600, exclude=["state", "session"])
async def get_pic_gallery(
    state: AppState = Depends(get_app_state),
    session: AsyncSession = Depends(get_session),
):
    """从图像库中获取图片列表。"""
    try:
        images = await state.public_svc.get_pic_gallery(session)
        return APIResponse(
            data={"images": images},
            message="Picture gallery retrieved successfully",
        )
    except Exception as exc:
        logger.error(f"Failed to retrieve picture gallery: {exc!r}")
        raise APIError(
            message="Failed to retrieve picture gallery",
            code=500,
        ) from exc
