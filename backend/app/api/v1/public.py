"""Public API router for ReadingList.

This module provides public endpoints that do not require authentication:
- API status checks
- robots.txt and sitemap.xml for SEO
- Media file serving
- Amap security key proxy
"""

from __future__ import annotations

from datetime import UTC, datetime
from xml.etree.ElementTree import Element, SubElement, tostring

import httpx
import orjson
from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from redis.asyncio import Redis as AsyncRedis

from app.api.des.limiter import limiter
from app.api.des.mongo import get_mongo_db
from app.api.des.redis import get_redis
from app.core.config import get_settings
from app.schemas.response import APIResponse
from app.utils.qweather_jwt import encoded_jwt

router = APIRouter(tags=["public"])


@router.get("/status")
async def get_api_status() -> APIResponse:
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
        data={"status": "ok"},
        message="API is running",
    )

    # Cache for 60 seconds

    return response


@router.get("/robots.txt", response_class=PlainTextResponse)
async def get_robots_txt() -> PlainTextResponse:
    """Return robots.txt file for search engines.

    Tells search engines which pages can be crawled.

    Returns:
        PlainTextResponse: robots.txt content
    """

    robots_content = """User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /
Allow: /blog/
Allow: /blog/*

Sitemap: https://readinglist.example.com/api/sitemap.xml
"""

    # Cache for 3600 seconds (1 hour)

    return PlainTextResponse(
        content=robots_content,
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/sitemap.xml")
async def get_sitemap_xml(
    mongodb=Depends(get_mongo_db),
) -> PlainTextResponse:
    """Generate and return sitemap.xml for SEO.

    Helps search engines better crawl the website.

    Returns:
        PlainTextResponse: sitemap.xml content
    """
    urlset = Element(
        "urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    )

    today = datetime.now(UTC).isoformat().split("T")[0]

    # Homepage
    url = SubElement(urlset, "url")
    loc = SubElement(url, "loc")
    loc.text = "https://readinglist.example.com"
    lastmod = SubElement(url, "lastmod")
    lastmod.text = today
    changefreq = SubElement(url, "changefreq")
    changefreq.text = "daily"
    priority = SubElement(url, "priority")
    priority.text = "1.0"

    # Blog list page
    url = SubElement(urlset, "url")
    loc = SubElement(url, "loc")
    loc.text = "https://readinglist.example.com/blog"
    lastmod = SubElement(url, "lastmod")
    lastmod.text = today
    changefreq = SubElement(url, "changefreq")
    changefreq.text = "daily"
    priority = SubElement(url, "priority")
    priority.text = "0.9"

    # Blog posts
    try:
        posts_collection = mongodb.collection("posts")
        cursor = posts_collection.find({}, {"_id": 1, "updated_at": 1})
        async for post in cursor:
            url = SubElement(urlset, "url")
            loc = SubElement(url, "loc")
            loc.text = f"https://readinglist.example.com/blog/{post['_id']}"

            if "updated_at" in post:
                lastmod = SubElement(url, "lastmod")
                lastmod_text = post["updated_at"]
                if hasattr(lastmod_text, "isoformat"):
                    lastmod.text = lastmod_text.isoformat().split("T")[0]
                else:
                    lastmod.text = str(lastmod_text)[:10]

            changefreq = SubElement(url, "changefreq")
            changefreq.text = "weekly"
            priority = SubElement(url, "priority")
            priority.text = "0.8"
    except Exception:
        # If MongoDB is not available, skip blog posts
        pass

    # About page
    url = SubElement(urlset, "url")
    loc = SubElement(url, "loc")
    loc.text = "https://readinglist.example.com/about"
    lastmod = SubElement(url, "lastmod")
    lastmod.text = today
    changefreq = SubElement(url, "changefreq")
    changefreq.text = "monthly"
    priority = SubElement(url, "priority")
    priority.text = "0.7"

    # Contact page
    url = SubElement(urlset, "url")
    loc = SubElement(url, "loc")
    loc.text = "https://readinglist.example.com/contact"
    lastmod = SubElement(url, "lastmod")
    lastmod.text = today
    changefreq = SubElement(url, "changefreq")
    changefreq.text = "monthly"
    priority = SubElement(url, "priority")
    priority.text = "0.6"

    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(
        urlset, encoding="unicode"
    )

    # Cache for 3600 seconds (1 hour)

    return PlainTextResponse(
        content=xml_content,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# @router.get("/media/{filename}")
# async def get_media_file(
#     filename: str,
# ) -> StreamingResponse:
#     """Serve media files.

#     Args:
#         filename: Media file path
#         request: FastAPI request object

#     Returns:
#         StreamingResponse: Media file content

#     Note:
#         Ensure MEDIA_PATH is configured correctly and securely
#         to prevent directory traversal attacks.
#     """
#     media_path = os.getenv("MEDIA_PATH", "app/media")

#     # Security: Prevent directory traversal
#     safe_filename = Path(filename).name
#     if safe_filename != filename.replace("\\", "/"):
#         raise HTTPException(status_code=404, detail="File not found")

#     file_path = os.path.join(media_path, safe_filename)

#     # Check if file exists and is a file
#     if not Path(file_path).is_file():
#         raise HTTPException(status_code=404, detail="File not found")

#     # Determine content type based on file extension
#     content_type = "application/octet-stream"
#     ext = Path(safe_filename).suffix.lower()
#     content_types = {
#         ".jpg": "image/jpeg",
#         ".jpeg": "image/jpeg",
#         ".png": "image/png",
#         ".gif": "image/gif",
#         ".webp": "image/webp",
#         ".svg": "image/svg+xml",
#         ".mp4": "video/mp4",
#         ".webm": "video/webm",
#         ".mp3": "audio/mpeg",
#         ".wav": "audio/wav",
#         ".pdf": "application/pdf",
#     }
#     if ext in content_types:
#         content_type = content_types[ext]

#     def file_iterator(file_path: str, chunk_size: int = 8192):
#         with open(file_path, "rb") as f:
#             while chunk := f.read(chunk_size):
#                 yield chunk

#     return StreamingResponse(
#         file_iterator(file_path),
#         media_type=content_type,
#         headers={
#             "Content-Disposition": f'inline; filename="{safe_filename}"',
#             "Cache-Control": "public, max-age=86400",
#         },
#     )


@router.post("/like")
@limiter.limit("25/day")
async def add_like(
    request: Request,
    redis: AsyncRedis = Depends(get_redis),
    likescounts: int = Body(
        ..., gt=0, embed=True, description="Number of likes to add"
    ),
) -> JSONResponse:
    """Add a like to the site.

    Returns:
        JSONResponse: Current total likes count
    """
    like_key = "site:total_likes"
    total = await redis.incrby(like_key, likescounts)

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
    likse = await redis.get("site:total_likes")
    if likse is not None:
        total_likes = int(likse)
    else:
        total_likes = 0

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
    import base64

    settings = get_settings()
    security_code = settings.AMAP_SECURITY_CODE

    encoded_key = base64.b64encode(security_code.encode()).decode()

    return APIResponse.ok(
        data={"securityJsCode": encoded_key},
        message="Amap security key retrieved successfully",
    )


@router.post("/weather")
@limiter.limit("100/hour")
async def get_weather(
    request: Request,
    city: str = Body(..., description="City adcode"),
    extensions: str = Body("base", description="Weather type: base/all"),
    redis: AsyncRedis = Depends(get_redis),
) -> JSONResponse:
    """Get weather information from Amap API.

    Args:
        city: City adcode
        extensions: Weather type (base for current, all for forecast)

    Returns:
        JSONResponse: Weather data from Amap API
    """

    # 尝试命中缓存
    cache_key = f"weather:{city}:{extensions}"
    cached_data = await redis.get(cache_key)
    if cached_data:
        return APIResponse.ok(
            data=orjson.loads(cached_data),
            message="Weather information retrieved from cache",
        )
    url = "https://restapi.amap.com/v3/weather/weatherInfo"
    params = {
        "key": get_settings().AMAP_WEB_KEY,
        "city": city,
        "extensions": extensions,
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()

    # Redis缓存天气数据，过期时间60分钟
    await redis.set(
        f"weather:{city}:{extensions}", orjson.dumps(data), ex=60 * 60
    )
    return APIResponse.ok(
        data=data,
        message="Weather information retrieved successfully",
    )


@router.post("/geocode/regeo")
@limiter.limit("100/hour")
async def reverse_geocode(
    request: Request,
    location: str = Body(..., description="Location coordinates: lng,lat"),
    extensions: str = Body("base", description="Extensions type"),
) -> JSONResponse:
    """Reverse geocode coordinates to address using Amap API.

    Args:
        location: Location coordinates in format "lng,lat"
        extensions: Extensions type

    Returns:
        JSONResponse: Address information including city adcode
    """
    url = "https://restapi.amap.com/v3/geocode/regeo"
    params = {
        "key": get_settings().AMAP_WEB_KEY,
        "location": location,
        "extensions": extensions,
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()

    return APIResponse.ok(
        data=data,
        message="Reverse geocode completed successfully",
    )


@router.get("/qweather/tide")
@limiter.limit("100/hour")
async def get_qweather(
    request: Request,
    redis: AsyncRedis = Depends(get_redis),
) -> JSONResponse:
    """Get weather information from QWeather API."""

    # 尝试命中缓存
    now = datetime.now().strftime("%Y%m%d")
    cache_key = f"qweather:tide:P2352:{now}"
    cached_data = await redis.get(cache_key)
    if cached_data:
        return APIResponse.ok(
            data=orjson.loads(cached_data),
            message="QWeather information retrieved from cache",
        )
    try:
        url = "https://qk2tupqwuj.re.qweatherapi.com/v7/ocean/tide"
        headers = {
            "Authorization": f"Bearer {encoded_jwt}",
        }
        now = datetime.now().strftime("%Y%m%d")
        payload = {
            "location": "P2352",  # 黄埔港
            "date": now,
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=payload)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError:
                return APIResponse.error(
                    message=f"QWeather API error: {response.status_code} - {response.text}",
                    code=response.status_code,
                )
            data = response.json()

        # 缓存数据12小时，过期后自动删除
        cache_key = f"qweather:tide:{payload['location']}:{payload['date']}"
        await redis.set(cache_key, orjson.dumps(data), ex=12 * 3600)
        return APIResponse.ok(
            data=data,
            message="QWeather information retrieved successfully",
        )
    except httpx.HTTPError as e:
        return APIResponse.error(
            message=f"Failed to fetch QWeather data: {e!s}",
            code=503,
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
) -> JSONResponse:
    """Get location information from QWeather API."""
    try:
        url = "https://qk2tupqwuj.re.qweatherapi.com/geo/v2/poi/lookup"
        headers = {
            "Authorization": f"Bearer {encoded_jwt}",
        }
        params = {"location": location, "type": type}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError:
                return APIResponse.error(
                    message=f"QWeather API error: {response.status_code} - {response.text}",
                    code=response.status_code,
                )
            data = response.json()

        return APIResponse.ok(
            data=data,
            message="QWeather location information retrieved successfully",
        )
    except httpx.HTTPError as e:
        return APIResponse.error(
            message=f"Failed to fetch QWeather location: {e!s}",
            code=503,
        )
    except Exception as e:
        return APIResponse.error(
            message=f"Internal server error: {e!s}",
            code=500,
        )
