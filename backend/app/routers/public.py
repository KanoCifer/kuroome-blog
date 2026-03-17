"""Public API router for ReadingList.

This module provides public endpoints that do not require authentication:
- API status checks
- robots.txt and sitemap.xml for SEO
- Media file serving
"""

from __future__ import annotations

from datetime import UTC, datetime
from xml.etree.ElementTree import Element, SubElement, tostring

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse, PlainTextResponse

from app.dependencies.limiter import limiter
from app.dependencies.mongo import get_mongo_db
from app.models.mgmodel import SiteStats
from app.schemas.response import APIResponse

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
@limiter.limit("1/day")
async def add_like(
    request: Request,
    likescounts: int = Body(
        ..., gt=0, embed=True, description="Number of likes to add"
    ),
) -> JSONResponse:
    """Add a like to the site.

    Returns:
        JSONResponse: Current total likes count
    """
    stats: SiteStats | None = await SiteStats.find_one({"key": "total_likes"})
    if stats:
        await stats.update({"$inc": {"value": likescounts}})
        total: int = stats.value
    else:
        stats = SiteStats(key="total_likes", value=likescounts)
        await stats.insert()
        total = likescounts

    return APIResponse.ok(
        data={"likes_count": total},
        message="Like added successfully",
    )


@router.get("/likes")
async def get_likes() -> JSONResponse:
    """Get total likes count.

    Returns:
        JSONResponse: Current total likes count
    """
    stats = await SiteStats.find_one({"key": "total_likes"})
    total_likes = stats.value if stats else 0

    return APIResponse.ok(
        data={"likes_count": total_likes},
        message="Likes count retrieved successfully",
    )
