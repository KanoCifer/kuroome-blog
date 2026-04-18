from fastapi import Request
from redis.asyncio import Redis as AsyncRedis

from app.core.container import (
    get_admin_service,
    get_ai_service,
    get_blog_service,
    get_book_service,
    get_device_service,
    get_fishing_service,
    get_message_service,
    get_monitor_service,
    get_notification_service,
    get_public_service,
    get_rss_service,
    get_sub_service,
    get_todo_service,
    get_user_service,
    get_weather_service,
    get_weread_service,
)


async def user_service_dep():
    async with get_user_service() as service:
        yield service


async def admin_service_dep():
    async with get_admin_service() as service:
        yield service


async def book_service_dep():
    async with get_book_service() as service:
        yield service


async def blog_service_dep():
    async with get_blog_service() as service:
        yield service


async def message_service_dep():
    async with get_message_service() as service:
        yield service


async def monitor_service_dep(request: Request):
    redis: AsyncRedis = request.app.state.redis
    async with get_monitor_service(redis=redis) as service:
        yield service


async def public_service_dep(request: Request):
    mongodb = request.app.state.mongo
    async with get_public_service(mongodb=mongodb) as service:
        yield service


async def rss_service_dep(request: Request):
    redis: AsyncRedis = request.app.state.redis
    async with get_rss_service(redis=redis) as service:
        yield service


async def todo_service_dep(request: Request):
    redis: AsyncRedis = request.app.state.redis
    async with get_todo_service(redis=redis) as service:
        yield service


async def weread_service_dep():
    async with get_weread_service() as service:
        yield service


async def ai_service_dep():
    async with get_ai_service() as service:
        yield service


async def sub_service_dep():
    async with get_sub_service() as service:
        yield service


async def notification_service_dep():
    async with get_notification_service() as service:
        yield service


async def device_service_dep():
    async with get_device_service() as service:
        yield service


async def fishing_service_dep():
    async with get_fishing_service() as service:
        yield service


async def weather_service_dep():
    async with get_weather_service() as service:
        yield service
