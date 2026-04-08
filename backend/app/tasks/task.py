from __future__ import annotations

from beanie import init_beanie
from email_validator import validate_email
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import EmailStr, NameEmail
from pymongo import AsyncMongoClient
from redis.asyncio import ConnectionPool
from redis.asyncio import Redis as AsyncRedis
from taskiq import (
    Context,
    TaskiqDepends,
    TaskiqEvents,
    TaskiqState,
)

from app.core.config import get_settings
from app.core.logger import logger
from app.core.mail import MailConfig
from app.models.beanie import (
    MessageBoard,
    Post,
    RssArticle,
    RssFeed,
    SubscriptionLog,
)
from app.schemas import (
    EmailCodeContent,
)
from app.tasks.broker import broker

CONNECTION_POOL = ConnectionPool.from_url(
    get_settings().REDIS_URL,
    decode_responses=True,
    max_connections=get_settings().REDIS_MAX_CONNECTIONS,
)


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def startup(state: TaskiqState) -> None:
    state.redis = AsyncRedis(connection_pool=CONNECTION_POOL)

    # 初始化MongoDB和Beanie
    state.mongo_client = AsyncMongoClient(get_settings().MONGO_URI)
    mongo_db = state.mongo_client["readinglist"]
    await init_beanie(
        database=mongo_db,
        document_models=[
            MessageBoard,
            Post,
            RssArticle,
            RssFeed,
            SubscriptionLog,
        ],
    )
    state.mongo = mongo_db


@broker.on_event(TaskiqEvents.WORKER_SHUTDOWN)
async def shutdown(state: TaskiqState) -> None:
    await state.redis.aclose()
    await state.mongo_client.close()


@broker.task
async def send_code(
    email: str,
    verification_code: str,
):
    """发送验证码邮件"""
    html = f"""<h1>这是您的验证码：</h1>
    <h1 style=\"color: blue;\">{verification_code}</h1>
    <p>请在10分钟内使用。</p>
    """
    valid_email: EmailStr = validate_email(email).email

    content = EmailCodeContent(
        recipient=valid_email,
        verification_code=verification_code,
        subject="ReadingList 注册验证码",
        body=html,
    )

    message = MessageSchema(
        subject=content.subject,
        recipients=[NameEmail(name="ReadingList", email=str(valid_email))],
        body=content.body,
        subtype=MessageType.html,
    )
    fm = FastMail(MailConfig.conf)

    try:
        await fm.send_message(message)
        logger.info(f"✅验证码邮件已发送到 {email}")
    except Exception as e:
        logger.error(f"❌发送验证码邮件失败: {e!s}")
        raise e


@broker.task
async def save_to_mongo(
    feed_url: str,
    entries: list,
    user_id: int,
    context: Context = TaskiqDepends(),
):
    """Taskiq将解析的RSS条目保存到MongoDB中。

    :param feed_url: RSS源链接
    :param entries: 解析后的RSS条目列表
    :param user_id: 当前用户ID
    """
    try:
        from app.core.container import get_rss_service

        async with get_rss_service(redis=context.state.redis) as rss_service:
            saved_count = await rss_service.save_entries_to_mongo(
                feed_url=feed_url,
                entries=entries,
            )
        logger.info(
            f"Background task: RSS {feed_url} saved {saved_count} new articles for user {user_id}"
        )
    except Exception as e:
        logger.error(
            f"Background task failed: Error saving RSS {feed_url} for user {user_id}: {e!r}"
        )


@broker.task
async def save_cache_to_redis(
    key: str,
    value: str,
    expire: int = 3600,
    context: Context = TaskiqDepends(),
):
    """将总结结果存储到 Redis中，供后续查询使用
    :param key: Redis 键
    :param value: Redis 值
    :param expire: 过期时间，单位为秒，默认为 3600（1小时）
    :param context: Taskiq 上下文对象，自动注入"""
    try:
        await context.state.redis.set(key, value, ex=expire)
    except Exception as e:
        logger.error(f"❌Failed to save cache to Redis: {e!r}")
