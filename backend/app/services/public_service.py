from __future__ import annotations

import base64
from datetime import UTC, datetime
from xml.etree.ElementTree import Element, SubElement, tostring

import httpx
import orjson
from redis.asyncio import Redis as AsyncRedis

from app.core.config import get_settings
from app.models.models import GalleryImage
from app.repositories.gallery_repo import GalleryRepo
from app.repositories.public_repo import PublicRepo
from app.schemas.aiagent import WeatherAnalysisInput
from app.schemas.gallery import GalleryInput

_FRONTEND_URL = get_settings().FRONTEND_URL.rstrip("/")


class PublicService:
    def __init__(
        self, repo: PublicRepo, gallery_repo: GalleryRepo | None = None
    ) -> None:
        self.repo: PublicRepo = repo
        self.gallery_repo: GalleryRepo | None = gallery_repo

    @staticmethod
    def get_api_status() -> dict[str, str]:
        return {"status": "ok"}

    @staticmethod
    def get_robots_txt() -> str:
        sitemap_url = f"{_FRONTEND_URL}/sitemap.xml"
        return f"""User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /

Sitemap: {sitemap_url}
"""

    async def build_sitemap_xml(self) -> str:
        urlset = Element(
            "urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        )

        today = datetime.now(UTC).isoformat().split("T")[0]

        # Static public pages
        self._append_static_url(urlset, _FRONTEND_URL, today, "daily", "1.0")
        self._append_static_url(
            urlset, f"{_FRONTEND_URL}/blog", today, "daily", "0.9"
        )
        self._append_static_url(
            urlset, f"{_FRONTEND_URL}/about", today, "monthly", "0.7"
        )
        self._append_static_url(
            urlset, f"{_FRONTEND_URL}/fishing-map", today, "weekly", "0.7"
        )
        self._append_static_url(
            urlset, f"{_FRONTEND_URL}/gallery", today, "weekly", "0.7"
        )
        self._append_static_url(
            urlset, f"{_FRONTEND_URL}/changelog", today, "weekly", "0.6"
        )
        self._append_static_url(
            urlset, f"{_FRONTEND_URL}/websites", today, "monthly", "0.6"
        )
        self._append_static_url(
            urlset, f"{_FRONTEND_URL}/todos", today, "weekly", "0.5"
        )
        self._append_static_url(
            urlset,
            f"{_FRONTEND_URL}/toolbox/image-toolbox",
            today,
            "monthly",
            "0.5",
        )

        # Blog posts from DB
        try:
            posts = await self.repo.list_sitemap_posts()
            for post in posts:
                url = SubElement(urlset, "url")
                loc = SubElement(url, "loc")
                loc.text = f"{_FRONTEND_URL}/blog/{post['_id']}"
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
            pass

        return '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(
            urlset,
            encoding="unicode",
        )

    @staticmethod
    def _append_static_url(
        urlset: Element,
        loc_value: str,
        lastmod_value: str,
        changefreq_value: str,
        priority_value: str,
    ) -> None:
        url = SubElement(urlset, "url")
        loc = SubElement(url, "loc")
        loc.text = loc_value
        lastmod = SubElement(url, "lastmod")
        lastmod.text = lastmod_value
        changefreq = SubElement(url, "changefreq")
        changefreq.text = changefreq_value
        priority = SubElement(url, "priority")
        priority.text = priority_value

    @staticmethod
    async def add_like(redis: AsyncRedis, likescounts: int) -> int:
        like_key = "site:total_likes"
        return await redis.incrby(like_key, likescounts)

    @staticmethod
    async def get_likes(redis: AsyncRedis) -> int:
        likes = await redis.get("site:total_likes")
        return int(likes) if likes is not None else 0

    @staticmethod
    def get_amap_security_key() -> str:
        settings = get_settings()
        security_code = settings.AMAP_SECURITY_CODE
        return base64.b64encode(security_code.encode()).decode()

    @staticmethod
    async def get_weather(
        redis: AsyncRedis,
        city: str,
        extensions: str,
    ) -> tuple[dict, bool]:
        cache_key = f"weather:{city}:{extensions}"
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data), True

        url = "https://restapi.amap.com/v3/weather/weatherInfo"
        params = {
            "key": get_settings().AMAP_WEB_KEY,
            "city": city,
            "extensions": extensions,
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            data = response.json()

        await redis.set(cache_key, orjson.dumps(data), ex=60 * 60)
        return data, False

    @staticmethod
    async def reverse_geocode(location: str, extensions: str) -> dict:
        url = "https://restapi.amap.com/v3/geocode/regeo"
        params = {
            "key": get_settings().AMAP_WEB_KEY,
            "location": location,
            "extensions": extensions,
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            return response.json()

    @staticmethod
    def _to_sse_event(content: str, is_end: bool) -> str:
        data = {"content": content, "is_end": is_end}
        return f"data:{orjson.dumps(data).decode()}\n\n"

    async def analyze_weather(
        self, weather_data: WeatherAnalysisInput, model_id: str | None = None
    ):
        """根据天气数据进行分析并生成报告"""
        from app.core.weather_analyzer import weather_analyzer
        from app.services.fishing_index import parse_tide_info

        async def _on_index_calculated(data: dict, ai_score: int) -> None:
            """训练回调：AI 分析完成后保存反馈并触发自动训练"""
            from app.core.container import get_fishing_service

            async with get_fishing_service() as svc:
                await svc.save_ai_analysis_feedback(data, ai_score, parse_tide_info)

        try:
            async for chunk in weather_analyzer.analyze_weather_stream(
                weather_data=weather_data,
                model_id=model_id,
                on_index_calculated=_on_index_calculated,
            ):
                yield self._to_sse_event(chunk, False)
            yield self._to_sse_event("", True)
        except ValueError as exc:
            yield self._to_sse_event(f"[ERROR] {exc!r}", True)
        except RuntimeError as exc:
            yield self._to_sse_event(f"[ERROR] {exc!r}", True)
        except Exception as exc:
            yield self._to_sse_event(f"[ERROR] 天气分析失败: {exc!r}", True)

    async def set_pic_gallery(
        self, redis: AsyncRedis, images: GalleryInput
    ) -> None:
        """设置图片画廊数据（双写到 DB 和 Redis）。"""
        if not images.images:
            await redis.delete("pic_gallery:images")
            if self.gallery_repo is not None:
                await self.gallery_repo.delete_all()
            return

        # 写入 DB
        if self.gallery_repo is not None:
            db_images = [
                GalleryImage(
                    url=img.url,
                    description=img.description,
                    sort_order=idx,
                )
                for idx, img in enumerate(images.images)
            ]
            await self.gallery_repo.save_images(db_images)

        # 写入 Redis（缓存）
        await redis.delete("pic_gallery:images")
        pipeline = redis.pipeline()
        for image in images.images:
            pipeline.rpush(
                "pic_gallery:images",
                orjson.dumps(image.model_dump()),
            )
        await pipeline.execute()

    async def get_pic_gallery(self, redis: AsyncRedis) -> list[dict]:
        """获取图片画廊数据，优先走 Redis 缓存，miss 时回源 DB。"""
        cached = await redis.lrange("pic_gallery:images", 0, -1)
        if cached:
            return [orjson.loads(img) for img in cached]  # type: ignore

        # 缓存 miss，从 DB 回源
        if self.gallery_repo is not None:
            db_images = await self.gallery_repo.list_all()
            if db_images:
                result = [
                    {
                        "id": str(img.id),
                        "url": img.url,
                        "description": img.description,
                        "uploadedAt": (
                            img.uploaded_at.isoformat()
                            if img.uploaded_at
                            else None
                        ),
                    }
                    for img in db_images
                ]
                # 异步回填缓存
                pipeline = redis.pipeline()
                for item in result:
                    pipeline.rpush("pic_gallery:images", orjson.dumps(item))
                await pipeline.execute()
                return result

        return []
