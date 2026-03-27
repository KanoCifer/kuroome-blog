from contextlib import asynccontextmanager

from pymongo.asynchronous.database import AsyncDatabase
from redis.asyncio import Redis as AsyncRedis

from app.api.des.db import get_async_session
from app.core.agent import ArticleSummarizer, article_summarizer
from app.repositories import (
    AdminRepo,
    AiRepo,
    BlogRepo,
    BookRepo,
    MessageRepo,
    MonitorRepo,
    PublicRepo,
    RssRepo,
    TodoRepo,
    UserRepo,
    WereadRepo,
)
from app.services.admin_service import AdminService
from app.services.ai_service import AiService
from app.services.blog_service import BlogService
from app.services.book_service import BookService
from app.services.message_service import MessageService
from app.services.monitor_service import MonitorService
from app.services.public_service import PublicService
from app.services.rss_service import RssService
from app.services.todo_service import TodoService
from app.services.user_service import UserService
from app.services.weread_service import WereadService
from app.utils import redis_cache


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
async def get_book_service():
    async with get_async_session() as session:
        book_repo = BookRepo(session)
        service = BookService(repo=book_repo)
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
async def get_monitor_service(redis: AsyncRedis):
    async with get_async_session() as session:
        monitor_repo = MonitorRepo(session)
        service = MonitorService(repo=monitor_repo, redis=redis)
        yield service


@asynccontextmanager
async def get_public_service(mongodb: AsyncDatabase):
    public_repo = PublicRepo(mongodb=mongodb)
    service = PublicService(repo=public_repo)
    yield service


@asynccontextmanager
async def get_rss_service(redis: AsyncRedis):
    async with get_async_session() as session:
        rss_repo = RssRepo(session)
        service = RssService(repo=rss_repo, redis=redis)
        yield service


@asynccontextmanager
async def get_todo_service(redis: AsyncRedis):
    todo_repo = TodoRepo(redis=redis)
    service = TodoService(repo=todo_repo)
    yield service


@asynccontextmanager
async def get_weread_service():
    async with get_async_session() as session:
        weread_repo = WereadRepo(session)
        service = WereadService(repo=weread_repo)
        yield service


@asynccontextmanager
async def get_ai_service(
    summarizer: ArticleSummarizer = article_summarizer,
):
    ai_repo = AiRepo()
    service = AiService(repo=ai_repo, summarizer=summarizer)
    yield service
