from contextlib import asynccontextmanager

from pymongo.asynchronous.database import AsyncDatabase
from redis.asyncio import Redis as AsyncRedis

from app.api.des import get_async_session
from app.core import ArticleSummarizer, article_summarizer
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
from app.services import (
    AdminService,
    AiService,
    BlogService,
    BookService,
    MessageService,
    MonitorService,
    PublicService,
    RssService,
    TodoService,
    UserService,
    WereadService,
)
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
async def get_monitor_service(redis: AsyncRedis | None = None):
    async with get_async_session() as session:
        monitor_repo = MonitorRepo(session)
        service = MonitorService(repo=monitor_repo, redis=redis)
        yield service


@asynccontextmanager
async def get_public_service(mongodb: AsyncDatabase | None = None):
    public_repo = PublicRepo(mongodb=mongodb)
    service = PublicService(repo=public_repo)
    yield service


@asynccontextmanager
async def get_rss_service(redis: AsyncRedis | None = None):
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
