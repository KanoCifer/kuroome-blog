from contextlib import asynccontextmanager
from dataclasses import dataclass

from pymongo.asynchronous.database import AsyncDatabase
from redis.asyncio import Redis as AsyncRedis

from app.api.des.db import get_async_session
from app.core.agent import ArticleSummarizer, article_summarizer
from app.repositories import (
    AdminRepo,
    AiRepo,
    BlogRepo,
    DevTaskRepo,
    FishingRepo,
    FriendLinkRepo,
    GalleryRepo,
    MessageRepo,
    MonitorRepo,
    PublicRepo,
    RssRepo,
    SubRepo,
    UserRepo,
    WereadRepo,
)
from app.services.admin_service import AdminService
from app.services.ai_service import AiService
from app.services.blog_service import BlogService
from app.services.devtask_service import DevTaskService
from app.services.fishing.fishing_service import FishingService
from app.services.friendlink_service import FriendLinkService
from app.services.message_service import MessageService
from app.services.monitor_service import MonitorService
from app.services.public_service import PublicService
from app.services.rss_service import RssService
from app.services.sub_service import SubService
from app.services.user import GitHubAuthService, PasskeyService, UserService
from app.services.weather_service import WeatherService
from app.services.weread import WereadService
from app.utils import redis_cache


@dataclass
class UserServices:
    """User 相关的服务集合"""

    user: UserService
    passkey: PasskeyService
    github: GitHubAuthService


@asynccontextmanager
async def get_user_services():
    """获取 User 相关的所有服务"""
    async with get_async_session() as session:
        user_repo = UserRepo(session)
        user_service = UserService(repo=user_repo)
        passkey_service = PasskeyService(user_service=user_service)
        github_service = GitHubAuthService(user_service=user_service)
        yield UserServices(
            user=user_service, passkey=passkey_service, github=github_service
        )


@asynccontextmanager
async def get_user_service():
    async with get_async_session() as session:
        user_repo = UserRepo(session)
        service = UserService(repo=user_repo)
        yield service


@asynccontextmanager
async def get_admin_service():
    async with get_async_session() as session:
        admin_repo = AdminRepo(session)
        service = AdminService(repo=admin_repo, cache=redis_cache)
        yield service


@asynccontextmanager
async def get_blog_service():
    async with get_async_session() as session:
        blog_repo = BlogRepo(session)
        service = BlogService(repo=blog_repo, cache=redis_cache)
        yield service


@asynccontextmanager
async def get_message_service():
    message_repo = MessageRepo()
    service = MessageService(repo=message_repo)
    yield service


@asynccontextmanager
async def get_monitor_service():
    async with get_async_session() as session:
        monitor_repo = MonitorRepo(session)
        service = MonitorService(repo=monitor_repo)
        yield service


@asynccontextmanager
async def get_public_service(mongodb: AsyncDatabase):
    async with get_async_session() as session:
        public_repo = PublicRepo(mongodb=mongodb)
        gallery_repo = GalleryRepo(session)
        service = PublicService(repo=public_repo, gallery_repo=gallery_repo)
        yield service


@asynccontextmanager
async def get_rss_service(redis: AsyncRedis):
    async with get_async_session() as session:
        rss_repo = RssRepo(session)
        service = RssService(repo=rss_repo, redis=redis)
        yield service


@asynccontextmanager
async def get_devtask_service():
    repo = DevTaskRepo()
    service = DevTaskService(repo=repo)
    yield service


@asynccontextmanager
async def get_weread_service():
    async with get_async_session() as session:
        weread_repo = WereadRepo(session)
        service = WereadService(repo=weread_repo)
        yield service


@asynccontextmanager
async def get_sub_service():
    async with get_async_session() as session:
        sub_repo = SubRepo(session)
        service = SubService(repo=sub_repo)
        yield service


@asynccontextmanager
async def get_ai_service(
    summarizer: ArticleSummarizer = article_summarizer,
):
    ai_repo = AiRepo()
    service = AiService(repo=ai_repo, summarizer=summarizer)
    yield service


@asynccontextmanager
async def get_notification_service(dispatcher=None):
    from app.notification.dispatcher import NotificationDispatcher

    async with get_async_session() as session:
        from app.repositories.notification_repo import NotificationRepo

        repo = NotificationRepo(session)
        from app.services.notification_service import NotificationService

        _dispatcher = dispatcher or NotificationDispatcher()
        service = NotificationService(_dispatcher, repo=repo)
        yield service


@asynccontextmanager
async def get_device_service():
    from app.repositories.device_repo import DeviceRepo

    async with get_async_session() as session:
        repo = DeviceRepo(session)
        from app.services.device_service import DeviceService

        service = DeviceService(repo=repo)
        yield service


@asynccontextmanager
async def get_fishing_service():
    repo = FishingRepo()
    service = FishingService(repo=repo)
    yield service


@asynccontextmanager
async def get_weather_service():
    service = WeatherService()
    yield service


@asynccontextmanager
async def get_friendlink_service():
    repo = FriendLinkRepo()
    service = FriendLinkService(repo=repo)
    yield service
