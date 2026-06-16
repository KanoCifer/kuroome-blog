from __future__ import annotations

import base64
from datetime import UTC, datetime
from xml.etree.ElementTree import Element, SubElement, tostring

import httpx2
import orjson
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy.ext.asyncio import AsyncSession

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

    async def get_status_detail(self, session: AsyncSession) -> dict:
        """Collect version, service, and system health metrics."""
        import asyncio
        import gc
        import platform
        import sys
        import time

        import psutil
        from sqlalchemy import text

        from app.core.startup import SERVER_START_TIME

        # Database health check
        db_ok = True
        try:
            await asyncio.wait_for(
                session.execute(text("SELECT 1")),
                timeout=3.0,
            )
        except Exception:
            db_ok = False

        # --- Version Info ---
        version_info = {
            "repo_url": "https://github.com/KanoCifer/kuroome-blog",
            "current_version": get_settings().API_VERSION,
        }

        # --- Service Info ---
        mem = psutil.virtual_memory()
        process = psutil.Process()
        heap_memory = process.memory_info().rss

        service_info = {
            "runtime": f"{sys.platform}/{platform.machine()}",
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "coroutines": len(asyncio.all_tasks()),
            "gc_count": gc.get_count(),
            "start_time": round(SERVER_START_TIME, 0),
            "heap_memory_bytes": heap_memory,
            "total_memory_bytes": mem.total,
            "db_ok": db_ok,
            "api_ok": True,
        }

        # --- System Info ---
        load_avg = [round(x, 2) for x in psutil.getloadavg()]

        system_info = {
            "system_time": time.strftime(
                "%Y/%m/%d %H:%M:%S", time.localtime()
            ),
            "system_timezone": "GMT+8",
            "os_name": f"{platform.system()} {platform.release()}",
            "os_version": platform.version(),
            "kernel_version": platform.release(),
            "cpu_model": platform.processor() or "Unknown",
            "cpu_count_physical": psutil.cpu_count(logical=False),
            "cpu_count_logical": psutil.cpu_count(logical=True),
            "load_average": {
                "1m": load_avg[0],
                "5m": load_avg[1],
                "15m": load_avg[2],
            },
            "cpu_percent": psutil.cpu_percent(interval=None),
            "memory_usage_percent": round(mem.percent, 1),
            "memory_used_bytes": mem.used,
            "memory_total_bytes": mem.total,
        }

        return {
            "version": version_info,
            "service": service_info,
            "system": system_info,
        }

    @staticmethod
    def get_robots_txt() -> str:
        sitemap_url = f"{_FRONTEND_URL}/sitemap.xml"
        return f"""User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /

Sitemap: {sitemap_url}
"""

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
        async with httpx2.AsyncClient() as client:
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
        async with httpx2.AsyncClient() as client:
            response = await client.get(url, params=params)
            return response.json()

    async def analyze_weather(
        self, weather_data: WeatherAnalysisInput, model_id: str | None = None
    ):
        """根据天气数据进行分析并生成报告"""
        from app.core.weather_analyzer import weather_analyzer
        from app.services.fishing.fishing_index import parse_tide_info

        async def _on_index_calculated(data: dict, ai_score: int) -> None:
            """训练回调：AI 分析完成后保存反馈并触发自动训练"""
            from app.core.container import get_fishing_service

            async with get_fishing_service() as svc:
                await svc.save_ai_analysis_feedback(
                    data, ai_score, parse_tide_info
                )

        try:
            async for chunk in weather_analyzer.analyze_weather_stream(
                weather_data=weather_data,
                model_id=model_id,
                on_index_calculated=_on_index_calculated,
            ):
                yield {"content": chunk, "is_end": False}
            yield {"content": "", "is_end": True}
        except ValueError as exc:
            yield {"content": f"[ERROR] {exc!r}", "is_end": True}
        except RuntimeError as exc:
            yield {"content": f"[ERROR] {exc!r}", "is_end": True}
        except Exception as exc:
            yield {"content": f"[ERROR] 天气分析失败: {exc!r}", "is_end": True}

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
        cached = await redis.lrange("pic_gallery:images", 0, -1)  # pyright: ignore[reportGeneralTypeIssues]
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

    # ── Changelog ──────────────────────────────────────────────

    async def get_changelogs(self) -> list[dict]:
        """获取所有 changelog。"""
        docs = await self.repo.get_changelogs()
        return [d.model_dump(mode="json", exclude_none=True) for d in docs]

    async def get_changelog_by_version(self, version: str) -> dict | None:
        """根据版本号获取单条 changelog。"""
        doc = await self.repo.get_changelog_by_version(version)
        return doc.model_dump(mode="json") if doc else None

    async def save_changelog(self, data: dict) -> dict:
        """保存或更新 changelog。"""
        doc = await self.repo.save_changelog(data)
        return doc.model_dump(mode="json", exclude_none=True)

    async def import_changelogs_from_json(self, items: list[dict]) -> dict:
        """从 JSON 数据批量导入 changelog，返回统计信息。"""
        inserted = await self.repo.save_changelogs(items)
        total = len(items)
        skipped = total - inserted
        return {
            "total": total,
            "inserted": inserted,
            "skipped": skipped,
        }

    async def delete_changelog(self, version: str) -> bool:
        """根据版本号删除 changelog。"""
        return await self.repo.delete_changelog(version)
