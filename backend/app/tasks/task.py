from datetime import UTC, datetime

import httpx
from beanie import init_beanie
from beanie.operators import In
from email_validator import validate_email
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import EmailStr
from pymongo import AsyncMongoClient
from redis.asyncio import ConnectionPool
from redis.asyncio import Redis as AsyncRedis
from taskiq import Context, TaskiqDepends, TaskiqEvents, TaskiqState

from app.core import get_settings
from app.core.config import settings as app_settings
from app.core.logger import logger
from app.core.mail import MailConfig
from app.models.beanie import (
    MessageBoard,
    Post,
    RssArticle,
    RssArticleGuidProjection,
    RssFeed,
)
from app.schemas.email import EmailCodeContent
from app.schemas.schemas import FeishuMessageContent, FeishuRichTextContent
from app.tasks.broker import broker

CONNECTION_POOL = ConnectionPool.from_url(
    app_settings.REDIS_URL,
    decode_responses=True,
    max_connections=app_settings.REDIS_MAX_CONNECTIONS,
)


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def startup(state: TaskiqState) -> None:
    state.redis = AsyncRedis(connection_pool=CONNECTION_POOL)

    # 初始化MongoDB和Beanie
    state.mongo_client = AsyncMongoClient(app_settings.MONGO_URI)
    mongo_db = state.mongo_client["readinglist"]
    await init_beanie(
        database=mongo_db,
        document_models=[MessageBoard, Post, RssArticle, RssFeed],
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
        recipients=[content.recipient],  # type: ignore
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
async def save_to_mongo(feed_url: str, entries: list, user_id: int):
    """
    Taskiq将解析的RSS条目保存到MongoDB中。
    :param feed_url: RSS源链接
    :param entries: 解析后的RSS条目列表
    :param user_id: 当前用户ID
    """
    saved_count = 0
    try:
        # 1. 收集所有entry的guid和内容
        entries_map = {}
        guids = []
        for entry in entries:
            guid = str(entry.get("id") or entry.get("link", ""))
            if not guid:
                continue
            guids.append(guid)
            entries_map[guid] = entry

        if not guids:
            logger.info(
                f"Background task: RSS {feed_url} has no valid entries for user {user_id}"
            )
            return

        # 2. 批量查询已存在的文章
        existing_articles = (
            await RssArticle.find(
                RssArticle.feed_url == feed_url, In(RssArticle.guid, guids)
            )
            .project(RssArticleGuidProjection)
            .to_list()
        )

        existing_guids = {article.guid for article in existing_articles}
        new_articles = []
        fetched_at = datetime.now(UTC)

        # 3. 处理新文章
        for guid in guids:
            if guid in existing_guids:
                continue

            entry = entries_map[guid]
            title = str(entry.get("title", ""))
            link = str(entry.get("link", ""))
            summary = str(entry.get("summary", ""))
            author = entry.get("author")
            author_str = str(author) if author is not None else None

            # Extract content from entry
            content_list = entry.get("content") or []
            if content_list:
                content = str(content_list[0].get("value", ""))
            else:
                content = summary

            # Parse published datetime
            pub_dt: datetime | None = None
            published_parsed = entry.get("published_parsed")
            updated_parsed = entry.get("updated_parsed")
            if published_parsed:
                t = tuple(int(x) for x in published_parsed[:6])  # type: ignore[union-attr]
                pub_dt = datetime(*t, tzinfo=UTC)
            elif updated_parsed:
                t = tuple(int(x) for x in updated_parsed[:6])  # type: ignore[union-attr]
                pub_dt = datetime(*t, tzinfo=UTC)

            # 创建新文章对象
            new_articles.append(
                RssArticle(
                    guid=guid,
                    feed_url=feed_url,
                    title=title,
                    link=link,
                    summary=summary,
                    content=content,
                    author=author_str,
                    published=pub_dt,
                    fetched_at=fetched_at,
                    read_by=[],
                )
            )

        # 4. 批量插入新文章
        if new_articles:
            await RssArticle.insert_many(new_articles)
            saved_count = len(new_articles)

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


@broker.task
async def send_feishu_message(
    message: str,
    msg_type: str = "text",
    title: str | None = None,
    context: Context = TaskiqDepends(),
):
    """发送飞书消息
    :param message: 消息内容
    :param msg_type: 消息类型，默认为 "text"，可选 "post"
    :param title: 消息标题，仅 msg_type="post" 时生效
    :param context: Taskiq 上下文对象，自动注入
    """
    url: str = get_settings().FEISHU_WEBHOOK_URL
    message = message.strip()
    if not message or not url:
        return

    # 使用去重守卫确保在 TTL 窗口内只发送一次消息
    redis = context.state.redis
    if redis is not None:
        from app.utils import dedup_guard

        try:
            async with dedup_guard(redis, "feishu_message_lock", ttl=300):
                if msg_type == "post":
                    # 飞书富文本消息格式需要包含 post 字段，content 是二维数组
                    content = {
                        "post": {
                            "zh_cn": {
                                "title": title,
                                "content": [
                                    [
                                        {
                                            "tag": "at",
                                            "user_id": "all",
                                            "user_name": "所有人",
                                        },
                                        {
                                            "tag": "text",
                                            "text": message,
                                        },
                                    ],
                                    [
                                        {
                                            "tag": "a",
                                            "text": "网站首页",
                                            "href": "https://kanocifer.chat",
                                        },
                                    ],
                                ],
                            }
                        }
                    }
                    payload = FeishuRichTextContent(
                        msg_type="post", content=content
                    )
                else:
                    payload = FeishuMessageContent(
                        msg_type=msg_type,
                        content={"text": message},
                    )
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            url, json=payload.model_dump()
                        )
                        response.raise_for_status()
                except Exception as e:
                    logger.error(f"发送飞书消息失败: {e!s}")
        except Exception as e:
            logger.warning(f"获取分布式锁失败，跳过发送飞书消息: {e!s}")
    else:
        logger.warning("Redis 客户端不可用，跳过分布式锁检查")
        if msg_type == "post":
            # 飞书富文本消息格式需要包含 post 字段，content 是二维数组
            content = {
                "post": {
                    "zh_cn": {
                        "title": title,
                        "content": [
                            [
                                {
                                    "tag": "at",
                                    "user_id": "all",
                                    "user_name": "所有人",
                                },
                                {
                                    "tag": "text",
                                    "text": message,
                                },
                            ],
                            [
                                {
                                    "tag": "a",
                                    "text": "网站首页",
                                    "href": "https://kanocifer.chat",
                                },
                            ],
                        ],
                    }
                }
            }
            payload = FeishuRichTextContent(msg_type="post", content=content)
        else:
            payload = FeishuMessageContent(
                msg_type=msg_type,
                content={"text": message},
            )
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload.model_dump())
                response.raise_for_status()
        except Exception as e:
            logger.error(f"发送飞书消息失败: {e!s}")
