from __future__ import annotations

import base64
import json
from datetime import UTC, datetime
from xml.etree.ElementTree import Element, SubElement, tostring

import httpx
import orjson
from redis.asyncio import Redis as AsyncRedis

from app.core import logger
from app.core.config import get_settings
from app.repositories.public_repo import PublicRepo
from app.schemas.aiagent import WeatherAnalysisInput
from app.schemas.gallery import GalleryInput
from app.utils.qweather_jwt import generate_qweather_jwt

_FRONTEND_URL = get_settings().FRONTEND_URL.rstrip("/")
_QWEATHER_BASE_URL = get_settings().QWEATHER_BASE_URL.rstrip("/")


class PublicDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class PublicService:
    def __init__(self, repo: PublicRepo) -> None:
        self.repo: PublicRepo = repo

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
    async def get_qweather_jwt(redis: AsyncRedis) -> str:
        cache_key = "qweather:jwt"
        cached_jwt = await redis.get(cache_key)
        if cached_jwt:
            if isinstance(cached_jwt, bytes):
                return cached_jwt.decode()
            return str(cached_jwt)

        encoded_jwt = generate_qweather_jwt()
        await redis.set(cache_key, encoded_jwt, ex=24 * 3600)
        return encoded_jwt

    @staticmethod
    async def get_qweather_tide(
        redis: AsyncRedis, harbor: str, date: str
    ) -> tuple[dict, bool]:
        cache_key: str = f"qweather:tide:{harbor}:{date}"
        cached_data = await redis.get(cache_key)

        encoded_jwt = await PublicService.get_qweather_jwt(redis)
        if cached_data:
            return orjson.loads(cached_data), True

        url = _QWEATHER_BASE_URL + "/v7/ocean/tide"
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        payload = {
            "location": harbor,
            "date": date,
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
    async def get_qweather_location(
        location: str, type_: str, redis: AsyncRedis
    ) -> dict:
        url = f"{_QWEATHER_BASE_URL}/geo/v2/poi/lookup"
        encoded_jwt = await PublicService.get_qweather_jwt(redis)
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

    @staticmethod
    def _to_sse_event(content: str, is_end: bool) -> str:
        data = {"content": content, "is_end": is_end}
        return f"data:{json.dumps(data, ensure_ascii=False)}\n\n"

    async def analyze_weather(self, weather_data: WeatherAnalysisInput):
        """根据天气数据进行分析并生成报告。"""
        from app.core.agent import weather_analyzer

        try:
            async for chunk in weather_analyzer.analyze_weather_stream(
                weather_data=weather_data
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
        """设置图片画廊数据。"""
        if not images.images:
            await redis.delete("pic_gallery:images")
            return

        await redis.delete("pic_gallery:images")
        pipeline = redis.pipeline()
        for image in images.images:
            pipeline.rpush(
                "pic_gallery:images",
                orjson.dumps(image.model_dump()),
            )
        await pipeline.execute()

    async def get_pic_gallery(self, redis: AsyncRedis) -> list[dict]:
        """获取图片画廊数据。"""
        return [
            orjson.loads(image)
            for image in await redis.lrange("pic_gallery:images", 0, -1)  # type: ignore
        ]  # type: ignore

    async def get_weather_forecast(
        self,
        days: int,
        redis: AsyncRedis,
        location: str | None = None,
        location_id: str | None = None,
    ) -> dict:
        """获取天气预报"""

        # 缓存键格式：qweather:forecast:{location}:{days}d
        if location_id:
            cache_key = f"qweather:forecast:{location_id}:{days}d"
        elif location:
            cache_key = f"qweather:forecast:{location}:{days}d"
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/v7/weather/{days}d"

        encoded_jwt = await PublicService.get_qweather_jwt(redis)
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        params = {"location": location or location_id}

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    url=url,
                    headers=headers,
                    params=params,
                )
                res.raise_for_status()

                # 缓存数据，过期时间为1小时
                await redis.set(cache_key, orjson.dumps(res.json()), ex=3600)
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise PublicDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise PublicDomainError(
                f"Failed to fetch QWeather forecast: {exc!s}",
                503,
            ) from exc

    async def get_current_weather(
        self,
        redis: AsyncRedis,
        location: str | None = None,
        location_id: str | None = None,
    ) -> dict:
        """获取当前天气
            缓存键格式：qweather:current:{location}

        返回：
            原始的和风天气API响应数据字典
            实时天气.get("now", {}) 中包含当前天气信息
        """

        # 缓存键格式：qweather:current:{location}
        if location_id:
            cache_key = f"qweather:current:{location_id}"
        elif location:
            cache_key = f"qweather:current:{location}"
        else:
            raise PublicDomainError("必须提供位置信息", 400)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/v7/weather/now"

        encoded_jwt = await PublicService.get_qweather_jwt(redis)
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        params = {"location": location or location_id}

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    url=url,
                    headers=headers,
                    params=params,
                )
                res.raise_for_status()

                # 缓存数据，过期时间为30分钟
                await redis.set(cache_key, orjson.dumps(res.json()), ex=600)
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise PublicDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise PublicDomainError(
                f"Failed to fetch QWeather current weather: {exc!s}",
                503,
            ) from exc

    async def get_poi_lookup(self, location: str, redis: AsyncRedis) -> dict:
        """获取地理位置信息"""

        # 缓存键格式：qweather:poi:{location}:{type}
        cache_key = f"qweather:poi:{location}:scenic"
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/geo/v2/poi/lookup"
        encoded_jwt = await PublicService.get_qweather_jwt(redis)
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        params = {"location": location, "type": "scenic"}

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    url=url,
                    headers=headers,
                    params=params,
                )
                res.raise_for_status()

                # 缓存数据，过期时间为1天
                await redis.set(
                    cache_key, orjson.dumps(res.json()), ex=24 * 3600
                )
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise PublicDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise PublicDomainError(
                f"Failed to fetch QWeather POI lookup: {exc!s}",
                503,
            ) from exc

    async def get_hourly_weather(
        self,
        hours: int,
        redis: AsyncRedis,
        location_id: str | None = None,
        location: str | None = None,
    ) -> dict:
        """获取逐小时天气预报"""

        # 缓存键格式：qweather:hourly:{location}
        if location_id:
            cache_key = f"qweather:hourly:{location_id}"
        elif location:
            cache_key = f"qweather:hourly:{location}"
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/v7/weather/{hours}h"
        encoded_jwt = await PublicService.get_qweather_jwt(redis)
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        params = {"location": location or location_id}

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    url=url,
                    headers=headers,
                    params=params,
                )
                res.raise_for_status()

                # 缓存数据，过期时间为1小时
                await redis.set(cache_key, orjson.dumps(res.json()), ex=1800)
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise PublicDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise PublicDomainError(
                f"Failed to fetch QWeather hourly weather: {exc!s}",
                503,
            ) from exc

    async def get_indicates(
        self,
        redis: AsyncRedis,
        location: str | None = None,
        location_id: str | None = None,
    ) -> dict:
        """获取钓鱼指数相关的天气指标数据"""

        # 缓存键格式：qweather:indicates:{location} 或 qweather:indicates:{location_id}
        if location_id:
            cache_key = f"qweather:indicates:{location_id}"
        elif location:
            cache_key = f"qweather:indicates:{location}"
        else:
            raise PublicDomainError("必须提供位置信息", 400)

        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/v7/indices/1d"
        encoded_jwt = await PublicService.get_qweather_jwt(redis)
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        params = {"location": location or location_id, "type": "4"}
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    url=url,
                    headers=headers,
                    params=params,
                )
                res.raise_for_status()
                # 缓存数据，过期时间为12小时
                await redis.set(
                    cache_key, orjson.dumps(res.json()), ex=12 * 3600
                )
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise PublicDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise PublicDomainError(
                f"Failed to fetch QWeather indices: {exc!s}",
                503,
            ) from exc

    async def get_full_weather_data(
        self, location: str, redis: AsyncRedis
    ) -> dict:
        """获取完整天气数据（当前 + 24小时预报 + 3天天气 + 潮汐数据）
        params:
            location: 地理位置坐标，格式为 "lng,lat" 保留两位小数
            redis: Redis 连接实例


        流程:
            根据location获取POI
            根据POI获取当前天气、24小时预报、7天天气和潮汐数据
                -实时天气：/v7/weather/now
                    - location
                -24小时预报：/v7/weather/24h
                    - location
                -3天天气：/v7/weather/3d
                    - location
                -潮汐数据：/v7/ocean/tide
                    - location（使用POI名称或ID）
                    - date（使用当前日期）格式为 YYYYMMDD
        returns:
            包含当前天气、24小时预报、3天天气和潮汐数据的完整天气数据字典
        """
        # 获取POI信息
        poi_data = await self.get_poi_lookup(location, redis)
        # 从POI数据中提取位置名称或ID，这里假设使用位置名称
        poi_name = (
            poi_data.get("poi", [])[0].get("name")
            if poi_data.get("poi")
            else None
        )
        poi_id = (
            poi_data.get("poi", [])[0].get("id")
            if poi_data.get("poi")
            else None
        )
        logger.info(
            f"POI lookup for location {location} returned: {poi_name} (ID: {poi_id})"
        )
        if not poi_name and not poi_id:
            raise PublicDomainError("无法获取位置的POI信息", 404)

        try:
            # 获取当前天气 - 使用原始坐标而非 poi_id
            current_weather = await self.get_current_weather(
                location=location, redis=redis
            )

            # 获取24小时预报 - 使用原始坐标
            hourly_weather = await self.get_hourly_weather(
                hours=24, redis=redis, location=location
            )
            # 获取3天天气 - 使用原始坐标
            daily_weather = await self.get_weather_forecast(
                location=location,
                days=3,
                redis=redis,
            )

            # 获取潮汐数据，使用当前日期
            date_str = datetime.now(UTC).strftime("%Y%m%d")
            tide_data, _ = await self.get_qweather_tide(
                redis, harbor="P2352", date=date_str
            )

            # 获取和风指数 - 使用原始坐标
            indicates_data = await self.get_indicates(redis, location=location)
        except PublicDomainError as exc:
            logger.error(
                f"Error fetching weather data for location {location}: {exc!s}"
            )
            raise
        except Exception as exc:
            logger.error(
                f"Unexpected error fetching weather data for location {location}: {exc!s}",
                exc_info=True,
            )
            raise PublicDomainError(
                "获取天气数据失败，请稍后再试", 503
            ) from exc

        logger.debug(
            f"Fetched full weather data for location: {location} (POI: {poi_name or poi_id})"
            f" - Current: {current_weather.get('now', {})}"
        )

        return {
            "current": current_weather,
            "hourly": hourly_weather,
            "daily": daily_weather,
            "tide": tide_data,
            "indicates": indicates_data,
        }
