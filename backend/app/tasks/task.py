from datetime import UTC, datetime

from beanie import init_beanie
from email_validator import EmailNotValidError, ValidatedEmail, validate_email
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import BaseModel, EmailStr
from pymongo import AsyncMongoClient
from redis.asyncio import ConnectionPool
from redis.asyncio import Redis as AsyncRedis
from taskiq import Context, TaskiqDepends, TaskiqEvents, TaskiqState

from app.configs import get_settings
from app.configs.config import settings as app_settings
from app.configs.logger import logger
from app.dependencies.mail import MailConfig
from app.models.mgmodel import MessageBoard, Post, RssArticle, RssFeed
from app.tasks.broker import broker

CONNECTION_POOL = ConnectionPool(
    host="localhost",
    port=6379,
    db=0,
    decode_responses=True,
    max_connections=10,
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


class BootstrapEmailContent(BaseModel):
    """引导邮件内容模型"""

    subject: str
    body: str
    recipient: EmailStr


@broker.task
async def send_bootstrap_emails(admin_email: str):
    """发送引导邮件给管理员"""
    settings = get_settings().SEND_BOOT_EMAIL
    if not settings:
        return

    html = """
    <h1 style="color: #4CAF50;">Kuroome's Blog API 引导邮件</h1>
    <p><strong>✅服务已成功启动！</strong></p>
    <p>当前时间：{now}</p>
    """
    # 验证管理员邮箱地址
    try:
        valid_email: ValidatedEmail = validate_email(admin_email)
        email: EmailStr = valid_email.email
        now: str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        content = BootstrapEmailContent(
            subject="Kuroome's Blog API 引导邮件",
            body=html.format(now=now),
            recipient=email,
        )
    except EmailNotValidError:
        logger.error(f"❌无效的管理员邮箱地址: {admin_email}")
        return

    message = MessageSchema(
        subject=content.subject,
        recipients=[content.recipient],  # type: ignore
        body=content.body,
        subtype=MessageType.html,
    )

    fm = FastMail(MailConfig.conf)

    try:
        await fm.send_message(message)
        logger.info("✅引导邮件已发送")
    except Exception as e:
        logger.error(f"❌发送引导邮件失败: {e!s}")
        raise e


class EmailCodeContent(BaseModel):
    """验证码邮件内容模型"""

    subject: str = "ReadingList 注册验证码"
    recipient: EmailStr
    verification_code: str
    body: str = ""  # 可选的邮件正文内容


@broker.task
async def _send_email_code(
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
        for entry in entries:
            guid = str(entry.get("id") or entry.get("link", ""))
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

            # Check if article already exists
            existing = await RssArticle.find_one(
                RssArticle.feed_url == feed_url,
                RssArticle.guid == guid,
            )
            if not existing:
                new_article = RssArticle(
                    guid=guid,
                    feed_url=feed_url,
                    title=title,
                    link=link,
                    summary=summary,
                    content=content,
                    author=author_str,
                    published=pub_dt,
                    fetched_at=datetime.now(UTC),
                    read_by=[],
                )
                await new_article.insert()
                saved_count += 1

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
    """将总结结果存储到 Redis,设置过期时间为 1 小时"""
    try:
        await context.state.redis.set(key, value, ex=expire)
    except Exception as e:
        logger.error(f"❌Failed to save cache to Redis: {e!r}")
