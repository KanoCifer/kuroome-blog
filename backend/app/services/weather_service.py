from __future__ import annotations

from datetime import UTC, datetime

import httpx
import orjson
from redis.asyncio import Redis as AsyncRedis

from app.core import logger
from app.core.config import get_settings
from app.utils.qweather_jwt import generate_qweather_jwt

_QWEATHER_BASE_URL = get_settings().QWEATHER_BASE_URL.rstrip("/")


class WeatherDomainError(Exception):
    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class WeatherService:
    @staticmethod
    async def get_qweather_jwt(redis: AsyncRedis) -> str:
        cache_key = "qweather:jwt"
        cached_jwt = await redis.get(cache_key)
        if cached_jwt:
            if isinstance(cached_jwt, bytes):
                return cached_jwt.decode()
            return str(cached_jwt)

        encoded_jwt: str = generate_qweather_jwt()
        await redis.set(cache_key, encoded_jwt, ex=24 * 3600)
        return encoded_jwt

    @staticmethod
    async def get_qweather_tide(
        redis: AsyncRedis, harbor: str, date: str
    ) -> tuple[dict, bool]:
        cache_key: str = f"qweather:tide:{harbor}:{date}"
        cached_data = await redis.get(cache_key)

        encoded_jwt = await WeatherService.get_qweather_jwt(redis)
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
            raise WeatherDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise WeatherDomainError(
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
        encoded_jwt = await WeatherService.get_qweather_jwt(redis)
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
            raise WeatherDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise WeatherDomainError(
                f"Failed to fetch QWeather location: {exc!s}",
                503,
            ) from exc

    async def get_weather_forecast(
        self,
        days: int,
        redis: AsyncRedis,
        location: str | None = None,
        location_id: str | None = None,
    ) -> dict:
        if location_id:
            cache_key = f"qweather:forecast:{location_id}:{days}d"
        elif location:
            cache_key = f"qweather:forecast:{location}:{days}d"
        else:
            raise WeatherDomainError("必须提供位置信息", 400)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/v7/weather/{days}d"

        encoded_jwt = await WeatherService.get_qweather_jwt(redis)
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

                await redis.set(cache_key, orjson.dumps(res.json()), ex=3600)
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise WeatherDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise WeatherDomainError(
                f"Failed to fetch QWeather forecast: {exc!s}",
                503,
            ) from exc

    async def get_current_weather(
        self,
        redis: AsyncRedis,
        location: str | None = None,
        location_id: str | None = None,
    ) -> dict:
        if location_id:
            cache_key = f"qweather:current:{location_id}"
        elif location:
            cache_key = f"qweather:current:{location}"
        else:
            raise WeatherDomainError("必须提供位置信息", 400)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/v7/weather/now"

        encoded_jwt = await WeatherService.get_qweather_jwt(redis)
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

                await redis.set(cache_key, orjson.dumps(res.json()), ex=600)
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise WeatherDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise WeatherDomainError(
                f"Failed to fetch QWeather current weather: {exc!s}",
                503,
            ) from exc

    async def get_poi_lookup(self, location: str, redis: AsyncRedis) -> dict:
        cache_key = f"qweather:poi:{location}:scenic"
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/geo/v2/poi/lookup"
        encoded_jwt = await WeatherService.get_qweather_jwt(redis)
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

                await redis.set(
                    cache_key, orjson.dumps(res.json()), ex=24 * 3600
                )
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise WeatherDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise WeatherDomainError(
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
        if location_id:
            cache_key = f"qweather:hourly:{location_id}"
        elif location:
            cache_key = f"qweather:hourly:{location}"
        else:
            raise WeatherDomainError("必须提供位置信息", 400)
        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/v7/weather/{hours}h"
        encoded_jwt = await WeatherService.get_qweather_jwt(redis)
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

                await redis.set(cache_key, orjson.dumps(res.json()), ex=1800)
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise WeatherDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise WeatherDomainError(
                f"Failed to fetch QWeather hourly weather: {exc!s}",
                503,
            ) from exc

    async def get_indices(
        self,
        redis: AsyncRedis,
        location: str | None = None,
        location_id: str | None = None,
    ) -> dict:
        if location_id:
            cache_key = f"qweather:indices:{location_id}"
        elif location:
            cache_key = f"qweather:indices:{location}"
        else:
            raise WeatherDomainError("必须提供位置信息", 400)

        cached_data = await redis.get(cache_key)
        if cached_data:
            return orjson.loads(cached_data)

        url = f"{_QWEATHER_BASE_URL}/v7/indices/1d"
        encoded_jwt = await WeatherService.get_qweather_jwt(redis)
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
                await redis.set(
                    cache_key, orjson.dumps(res.json()), ex=12 * 3600
                )
                return res.json()
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise WeatherDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise WeatherDomainError(
                f"Failed to fetch QWeather indices: {exc!s}",
                503,
            ) from exc

    async def get_nearby_tsta(self, location: str, redis: AsyncRedis) -> dict:
        """获取指定经纬度附近的潮汐站点（TSTA）信息。

        Returns
            dict: 包含站点名称和ID的字典，例如 {"name": "站点名称", "id": "站点ID"}。
        """
        url = f"{_QWEATHER_BASE_URL}/geo/v2/poi/lookup"
        encoded_jwt = await self.get_qweather_jwt(redis)
        headers = {"Authorization": f"Bearer {encoded_jwt}"}
        params = {"location": location, "type": "TSTA"}
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    url=url,
                    headers=headers,
                    params=params,
                )
                res.raise_for_status()
                res = res.json()
                data = res.get("poi", [])[0] if res.get("poi") else {}
                return {"id": data.get("id")}
        except httpx.HTTPStatusError as exc:
            response = exc.response
            raise WeatherDomainError(
                f"QWeather API error: {response.status_code} - {response.text}",
                response.status_code,
            ) from exc
        except httpx.HTTPError as exc:
            raise WeatherDomainError(
                f"Failed to fetch QWeather nearby TSTA: {exc!s}",
                503,
            ) from exc

    async def get_full_weather_data(
        self, location: str, redis: AsyncRedis
    ) -> dict:
        poi_data = await self.get_poi_lookup(location, redis)
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

        try:
            tsta_info = await self.get_nearby_tsta(location, redis)
            if tsta_info.get("id"):
                tsta_id = tsta_info["id"]
                logger.info(
                    f"Found nearby TSTA station for ID: {tsta_info['id']})"
                )
            else:
                logger.warning(
                    f"No nearby TSTA station found for location {location}"
                )
        except WeatherDomainError as exc:
            logger.error(
                f"Error fetching nearby TSTA station for location {location}: {exc!s}"
            )
            tsta_id = None

        if not poi_name and not poi_id:
            raise WeatherDomainError("无法获取位置的POI信息", 404)

        try:
            current_weather = await self.get_current_weather(
                location=location, redis=redis
            )

            hourly_weather = await self.get_hourly_weather(
                hours=24, redis=redis, location=location
            )
            daily_weather = await self.get_weather_forecast(
                location=location,
                days=3,
                redis=redis,
            )

            date_str = datetime.now(UTC).strftime("%Y%m%d")
            tide_data, _ = await self.get_qweather_tide(
                redis, harbor=tsta_id or "P2352", date=date_str
            )

            indices_data = await self.get_indices(redis, location=location)
        except WeatherDomainError as exc:
            logger.error(
                f"Error fetching weather data for location {location}: {exc!s}"
            )
            raise
        except Exception as exc:
            logger.error(
                f"Unexpected error fetching weather data for location {location}: {exc!s}",
                exc_info=True,
            )
            raise WeatherDomainError(
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
            "indices": indices_data,
            "locationName": poi_name or "",
            "poiId": poi_id or "",
        }


weather_service = WeatherService()
