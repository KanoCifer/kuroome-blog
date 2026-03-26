from __future__ import annotations

import base64
from datetime import UTC, datetime
from xml.etree.ElementTree import Element, SubElement, tostring

import httpx
import orjson
from redis.asyncio import Redis as AsyncRedis

from app.core.config import get_settings
from app.repositories.public_repo import PublicRepository
from app.utils.qweather_jwt import encoded_jwt


class PublicDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class PublicService:
    def __init__(self, repo: PublicRepository) -> None:
        self.repo = repo

    @staticmethod
    def get_api_status() -> dict[str, str]:
        return {"status": "ok"}

    @staticmethod
    def get_robots_txt() -> str:
        return """User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /
Allow: /blog/
Allow: /blog/*

Sitemap: https://readinglist.example.com/api/sitemap.xml
"""

    async def build_sitemap_xml(self) -> str:
        urlset = Element(
            "urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        )

        today = datetime.now(UTC).isoformat().split("T")[0]
        self._append_static_url(
            urlset,
            "https://readinglist.example.com",
            today,
            "daily",
            "1.0",
        )
        self._append_static_url(
            urlset,
            "https://readinglist.example.com/blog",
            today,
            "daily",
            "0.9",
        )

        try:
            posts = await self.repo.list_sitemap_posts()
            for post in posts:
                url = SubElement(urlset, "url")
                loc = SubElement(url, "loc")
                loc.text = (
                    f"https://readinglist.example.com/blog/{post['_id']}"
                )
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

        self._append_static_url(
            urlset,
            "https://readinglist.example.com/about",
            today,
            "monthly",
            "0.7",
        )
        self._append_static_url(
            urlset,
            "https://readinglist.example.com/contact",
            today,
            "monthly",
            "0.6",
        )

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
    async def get_qweather_tide(redis: AsyncRedis) -> tuple[dict, bool]:
        now = datetime.now().strftime("%Y%m%d")
        cache_key = f"qweather:tide:P2352:{now}"
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data), True

        url = "https://qk2tupqwuj.re.qweatherapi.com/v7/ocean/tide"
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        payload = {
            "location": "P2352",
            "date": now,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=headers,
                    params=payload,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise PublicDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise PublicDomainError(
                f"Failed to fetch QWeather data: {exc!s}",
                503,
            ) from exc

        await redis.set(cache_key, orjson.dumps(data), ex=12 * 3600)
        return data, False

    @staticmethod
    async def get_qweather_location(location: str, type_: str) -> dict:
        url = "https://qk2tupqwuj.re.qweatherapi.com/geo/v2/poi/lookup"
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        params = {"location": location, "type": type_}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=headers,
                    params=params,
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise PublicDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise PublicDomainError(
                f"Failed to fetch QWeather location: {exc!s}",
                503,
            ) from exc
