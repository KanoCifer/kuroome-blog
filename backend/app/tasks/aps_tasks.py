import asyncio
import json
import time
from datetime import UTC, datetime, timedelta
from enum import Enum
from itertools import repeat

import feedparser
import httpx
import orjson
from beanie.operators import In
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy import distinct, func, select
from taskiq import Context, TaskiqDepends

from app.configs import get_settings
from app.configs.logger import logger
from app.dependencies.database import AsyncSessionFactory, get_async_session
from app.models.mgmodel import RssArticle, RssArticleGuidProjection
from app.models.models import RssInfo, VisitorTrack
from app.schemas import VisitorData
from app.schemas.schemas import FeishuMessageContent
from app.tasks.broker import broker
from app.tasks.task import send_feishu_message


class MSGType(Enum):
    TEXT = "text"
    POST = "post"


@broker.task(
    schedule=[
        {
            "interval": 3600,
            "schedule_id": "redis_to_db_migration",
        }
    ]
)
async def run_migration_job(context: Context = TaskiqDepends()):
    """迁移Redis访客数据到PostgreSQL"""
    start_time = time.perf_counter()
    queue_key = "migration_queue"
    batch_size = 1000  # 每批处理 1000 条，可根据服务器性能调整
    processed_count = 0
    valid_items = []

    # 可根据需要保留或删除启动日志
    # logger.info(
    #     f"[MigrationJob] 🚀 Starting visitor data migration job | batch_size={batch_size}"
    # )

    try:
        redis: AsyncRedis = context.state.redis
        # 1. 批量从 Redis 取出数据 (使用 Pipeline 减少网络 IO)
        fetch_start = time.perf_counter()
        pipe = redis.pipeline()

        # 批量执行 POP
        for _ in repeat(None, batch_size):
            pipe.lpop(queue_key)

        # 执行并获取结果
        items = await pipe.execute()

        # 过滤掉 None (队列空了返回的就是 None)
        valid_items = [item for item in items if item is not None]
        fetch_duration = time.perf_counter() - fetch_start

        if not valid_items:
            duration = time.perf_counter() - start_time
            logger.info(
                f"[MigrationJob] ✅ Completed | duration={duration:.2f}s | 0 items to migrate"
            )
            return {
                "status": "success",
                "migrated": 0,
                "duration": f"{duration:.2f}s",
            }

        # 2. 批量解析 JSON
        parse_start = time.perf_counter()
        try:
            parsed_data_list: list[VisitorData] = [
                VisitorData(**orjson.loads(item)) for item in valid_items
            ]
            parse_duration = time.perf_counter() - parse_start
        except json.JSONDecodeError as e:
            error_msg = str(e)
            parse_duration = time.perf_counter() - parse_start
            logger.warning(
                f"[MigrationJob] JSON parsing failed | error={error_msg} | parse_duration={parse_duration:.2f}s"
            )

            # 把有效数据塞回Redis
            for item in reversed(valid_items):
                redis.lpush(queue_key, item)

            duration = time.perf_counter() - start_time
            logger.error(
                f"[MigrationJob] ❌ Job failed | duration={duration:.2f}s | error=JSON parsing failed"
            )
            return {
                "status": "failed",
                "error": error_msg,
                "duration": f"{duration:.2f}s",
            }

        # 3. 处理时间字段，转换为 datetime 对象
        transform_start = time.perf_counter()
        transform_duration = time.perf_counter() - transform_start

        # 4. 批量写入数据库 (一次 Session, 一次 Commit)
        db_start = time.perf_counter()
        async with AsyncSessionFactory() as session:
            # 构建所有 ORM 对象
            track_objects: list[VisitorTrack] = [
                VisitorTrack(**data.model_dump()) for data in parsed_data_list
            ]

            session.add_all(track_objects)
            await session.commit()

            processed_count = len(track_objects)
            db_duration = time.perf_counter() - db_start

        # 完成统计
        duration = time.perf_counter() - start_time
        logger.info(
            f"[MigrationJob]✅Completed | duration={duration:.2f}s | fetched={len(valid_items)} | migrated={processed_count} | fetch={fetch_duration:.2f}s | parse={parse_duration:.2f}s | db={db_duration:.2f}s"
        )
        return {
            "status": "success",
            "total": len(valid_items),
            "migrated": processed_count,
            "duration": f"{duration:.2f}s",
        }

    except Exception as e:
        duration = time.perf_counter() - start_time
        logger.exception(
            f"[MigrationJob] ❌ Job failed | duration={duration:.2f}s | error={e!s}"
        )
        # 异常时，把取出来的数据塞回 Redis 头部，防止数据丢失
        if "valid_items" in locals() and valid_items:
            # 注意要倒序塞回去，保证顺序不变
            restore_start = time.perf_counter()
            for item in reversed(valid_items):
                await redis.lpush(queue_key, item)  # type: ignore
            restore_duration = time.perf_counter() - restore_start
            logger.info(
                f"[MigrationJob] Restored {len(valid_items)} items back to Redis | restore_duration={restore_duration:.2f}s"
            )

        return {
            "status": "failed",
            "error": str(e),
            "duration": f"{duration:.2f}s",
        }


@broker.task(
    schedule=[
        {
            "cron": "0 10 * * *",
            "schedule_id": "rss_refresh",
            # 指定时区：Taskiq 支持在调度字典中使用 `cron_offset`（可为时区字符串或 timedelta）
            "cron_offset": "Asia/Shanghai",
        }
    ]
)
async def refresh_rss_feeds():
    """Daily RSS refresh at 10:00 (Asia/Shanghai) for all users, saves new articles to MongoDB."""
    start_time = time.perf_counter()
    logger.info("[RSSRefreshJob] 🔄 Starting RSS feed refresh job")

    try:
        # 1. 获取所有RSS源
        db_start = time.perf_counter()
        async with AsyncSessionFactory() as session:
            # 查询所有不同的 feed_url
            result = await session.execute(select(RssInfo.rss_url).distinct())
            feed_urls = result.scalars().all()
        db_duration = time.perf_counter() - db_start

        if not feed_urls:
            duration = time.perf_counter() - start_time
            logger.info(
                f"[RSSRefreshJob] ✅ Job completed | duration={duration:.2f}s | no RSS feeds configured"
            )
            message = "RSS 刷新完成，但没有配置任何 RSS 源。请前往设置页面添加 RSS 源。"
            # 发送飞书消息
        try:
            await send_feishu_message.kiq(
                message=message, msg_type="post", title="✅Rss 刷新完成通知"
            )
        except Exception as feishu_e:
            logger.error(f"Failed to send Feishu notification: {feishu_e!r}")
            return {
                "status": "success",
                "total_feeds": 0,
                "new_articles": 0,
                "duration": f"{duration:.2f}s",
            }

        logger.info(
            f"[RSSRefreshJob] Found {len(feed_urls)} RSS feeds to refresh | db_query_duration={db_duration:.2f}s"
        )

        # 使用信号量限制并发数
        semaphore = asyncio.Semaphore(5)
        success_count = 0
        failed_feeds = []

        async def fetch_and_save_feed(feed_url: str):
            nonlocal success_count
            feed_start = time.perf_counter()
            async with semaphore:
                try:
                    # 先异步获取feed内容，带超时控制
                    async with httpx.AsyncClient(
                        timeout=httpx.Timeout(10.0, connect=5.0),
                        follow_redirects=True,
                    ) as client:
                        resp = await client.get(feed_url)
                        resp.raise_for_status()
                        content = resp.content

                    # 在线程池中运行 feedparser.parse（仅解析，无网络IO）
                    loop = asyncio.get_event_loop()
                    feed = await loop.run_in_executor(
                        None, feedparser.parse, content
                    )

                    if feed.bozo != 0:
                        feed_duration = time.perf_counter() - feed_start
                        failed_feeds.append(
                            {
                                "url": feed_url,
                                "error": f"Parse error (bozo={feed.bozo})",
                                "duration": f"{feed_duration:.2f}s",
                            }
                        )
                        logger.warning(
                            f"[RSSRefreshJob] Failed to parse feed: {feed_url} | bozo={feed.bozo} | duration={feed_duration:.2f}s"
                        )
                        return 0

                    saved_count = 0

                    # 1. 收集所有entry的guid和内容
                    entries_map = {}
                    guids = []
                    for entry in feed.entries:
                        guid = entry.get("id") or entry.get("link", "")
                        if not guid:
                            continue
                        guid = str(guid)
                        guids.append(guid)
                        entries_map[guid] = entry

                    if guids:
                        # 2. 批量查询已存在的文章
                        existing_articles = (
                            await RssArticle.find(
                                RssArticle.feed_url == feed_url,
                                In(RssArticle.guid, guids),
                            )
                            .project(RssArticleGuidProjection)
                            .to_list()
                        )

                        existing_guids = {
                            article.guid for article in existing_articles
                        }
                        new_articles = []
                        fetched_at = datetime.now(UTC)

                        # 3. 处理新文章
                        for guid in guids:
                            if guid in existing_guids:
                                continue

                            entry = entries_map[guid]
                            # 提取文章字段
                            title = str(entry.get("title", ""))
                            link = str(entry.get("link", ""))
                            summary = str(entry.get("summary", ""))

                            # 提取 content
                            content_list = entry.get("content")
                            if content_list:
                                content = str(content_list[0].get("value", ""))
                            else:
                                content = summary

                            # 提取 author
                            raw_author = entry.get("author")
                            author = (
                                str(raw_author)
                                if raw_author is not None
                                else None
                            )

                            # 提取发布时间
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
                                    author=author,
                                    published=pub_dt,
                                    fetched_at=fetched_at,
                                    read_by=[],
                                )
                            )

                        # 4. 批量插入新文章
                        if new_articles:
                            await RssArticle.insert_many(new_articles)
                            saved_count = len(new_articles)

                    feed_duration = time.perf_counter() - feed_start
                    success_count += 1
                    logger.info(
                        f"[RSSRefreshJob] Feed {feed_url} refreshed | saved={saved_count} new articles | duration={feed_duration:.2f}s"
                    )
                    return saved_count

                except Exception as e:
                    feed_duration = time.perf_counter() - feed_start
                    failed_feeds.append(
                        {
                            "url": feed_url,
                            "error": str(e),
                            "duration": f"{feed_duration:.2f}s",
                        }
                    )
                    logger.error(
                        f"[RSSRefreshJob] Error refreshing feed {feed_url}: {e!r} | duration={feed_duration:.2f}s"
                    )
                    return 0

        # 并发刷新所有 feed
        tasks = [fetch_and_save_feed(url) for url in feed_urls]
        results = await asyncio.gather(*tasks)
        total_saved = sum(results)

        # 完成统计
        duration = time.perf_counter() - start_time
        logger.info(
            f"[RSSRefreshJob] ✅ Job completed | duration={duration:.2f}s | total_feeds={len(feed_urls)} | success={success_count} | failed={len(failed_feeds)} | new_articles={total_saved}"
        )
        message = f"✅RSS 刷新完成！\n\n总 RSS 源: {len(feed_urls)}\n成功刷新: {success_count}\n失败: {len(failed_feeds)}\n新增文章: {total_saved}\n总耗时: {duration:.2f}秒"

        if failed_feeds:
            logger.warning(
                f"[RSSRefreshJob] Failed feeds: {[feed['url'] for feed in failed_feeds]}"
            )

        # Send Feishu notification
        try:
            await send_feishu_message.kiq(
                message=message, msg_type="post", title="✅Rss 刷新完成通知"
            )
        except Exception as e:
            logger.error(f"Failed to send Feishu notification: {e!r}")

        return {
            "status": "success",
            "total_feeds": len(feed_urls),
            "success": success_count,
            "failed": len(failed_feeds),
            "new_articles": total_saved,
            "failed_feeds": failed_feeds,
            "duration": f"{duration:.2f}s",
        }

    except Exception as e:
        error_msg = str(e)
        duration = time.perf_counter() - start_time
        logger.exception(
            f"[RSSRefreshJob] ❌ Job failed | duration={duration:.2f}s | error={error_msg}"
        )
        message = (
            f"❌RSS 刷新失败！\n错误信息: {error_msg}\n耗时: {duration:.2f}秒"
        )
        # Send Feishu notification
        try:
            await send_feishu_message.kiq(
                message=message, msg_type="post", title="❌Rss 刷新失败通知"
            )
        except Exception as feishu_e:
            logger.error(f"Failed to send Feishu notification: {feishu_e!r}")
        return {
            "status": "failed",
            "error": str(e),
            "duration": f"{duration:.2f}s",
        }


@broker.task(
    schedule=[
        {
            "cron": "0 8 * * *",
            "schedule_id": "daily_visitor_summary",
            "cron_offset": "Asia/Shanghai",
        }
    ]
)
async def send_daily_summary():
    """每天早上8点发送前一天的访问统计摘要飞书消息给管理员"""
    settings = get_settings()

    # 检查飞书webhook配置
    if not settings.FEISHU_WEBHOOK_URL:
        logger.warning("⚠️ 未配置飞书webhook，跳过发送每日统计飞书消息")
        return

    # 计算昨天的时间范围 (UTC)
    yesterday_start = (datetime.now(UTC) - timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    yesterday_end = yesterday_start + timedelta(days=1)

    try:
        # 获取数据库会话
        async with get_async_session() as session:
            # 1. 总访问量
            total_visits = (
                await session.scalar(
                    select(func.count(VisitorTrack.id))
                    .where(VisitorTrack.visit_time >= yesterday_start)
                    .where(VisitorTrack.visit_time < yesterday_end)
                )
                or 0
            )

            # 2. 独立访客数 (按visitor_id)
            unique_visitors = (
                await session.scalar(
                    select(func.count(distinct(VisitorTrack.visitor_id)))
                    .where(VisitorTrack.visit_time >= yesterday_start)
                    .where(VisitorTrack.visit_time < yesterday_end)
                )
                or 0
            )

            # 3. 独立IP数
            unique_ips = (
                await session.scalar(
                    select(func.count(distinct(VisitorTrack.ip_address)))
                    .where(VisitorTrack.visit_time >= yesterday_start)
                    .where(VisitorTrack.visit_time < yesterday_end)
                )
                or 0
            )

            # 4. 访问量前5的页面
            top_pages = await session.execute(
                select(
                    VisitorTrack.page_path,
                    func.count(VisitorTrack.id).label("count"),
                )
                .where(VisitorTrack.visit_time >= yesterday_start)
                .where(VisitorTrack.visit_time < yesterday_end)
                .group_by(VisitorTrack.page_path)
                .order_by(func.count(VisitorTrack.id).desc())
                .limit(5)
            )
            top_pages = top_pages.all()

            # 5. 浏览器分布
            browser_stats = await session.execute(
                select(
                    VisitorTrack.browser_name,
                    func.count(distinct(VisitorTrack.visitor_id)).label(
                        "count"
                    ),
                )
                .where(VisitorTrack.visit_time >= yesterday_start)
                .where(VisitorTrack.visit_time < yesterday_end)
                .where(VisitorTrack.browser_name.isnot(None))
                .group_by(VisitorTrack.browser_name)
                .order_by(func.count(distinct(VisitorTrack.visitor_id)).desc())
            )
            browser_stats = browser_stats.all()

            # 6. 操作系统分布
            os_stats = await session.execute(
                select(
                    VisitorTrack.os_name,
                    func.count(distinct(VisitorTrack.visitor_id)).label(
                        "count"
                    ),
                )
                .where(VisitorTrack.visit_time >= yesterday_start)
                .where(VisitorTrack.visit_time < yesterday_end)
                .where(VisitorTrack.os_name.isnot(None))
                .group_by(VisitorTrack.os_name)
                .order_by(func.count(distinct(VisitorTrack.visitor_id)).desc())
            )
            os_stats = os_stats.all()

            # 7. 设备类型分布
            device_stats = await session.execute(
                select(
                    VisitorTrack.device_type,
                    func.count(distinct(VisitorTrack.visitor_id)).label(
                        "count"
                    ),
                )
                .where(VisitorTrack.visit_time >= yesterday_start)
                .where(VisitorTrack.visit_time < yesterday_end)
                .where(VisitorTrack.device_type.isnot(None))
                .group_by(VisitorTrack.device_type)
                .order_by(func.count(distinct(VisitorTrack.visitor_id)).desc())
            )
            device_stats = device_stats.all()

        # 生成飞书消息内容
        yesterday_str = yesterday_start.strftime("%Y-%m-%d")

        message_lines = [
            f"# 📊 每日访问统计摘要 - {yesterday_str}",
            "",
            "## 📈 核心指标",
            f"- **总访问量**: {total_visits} 次",
            f"- **独立访客**: {unique_visitors} 人",
            f"- **独立IP**: {unique_ips} 个",
            "",
        ]

        # 热门页面
        if top_pages:
            message_lines.extend(
                [
                    "## 🔥 热门页面 Top 5",
                    "| 页面路径 | 访问量 | 占比 |",
                    "|---------|-------|-----|",
                ]
            )
            for page, count in top_pages:
                percentage = (
                    count / total_visits * 100 if total_visits > 0 else 0
                )
                message_lines.append(
                    f"| {page} | {count} | {percentage:.1f}% |"
                )
            message_lines.append("")

        # 浏览器分布
        if browser_stats:
            message_lines.extend(
                [
                    "## 🌐 浏览器分布",
                    "| 浏览器 | 用户数 | 占比 |",
                    "|-------|-------|-----|",
                ]
            )
            for browser, count in browser_stats:
                percentage = (
                    count / unique_visitors * 100 if unique_visitors > 0 else 0
                )
                message_lines.append(
                    f"| {browser or '未知'} | {count} | {percentage:.1f}% |"
                )
            message_lines.append("")

        # 操作系统分布
        if os_stats:
            message_lines.extend(
                [
                    "## 💻 操作系统分布",
                    "| 操作系统 | 用户数 | 占比 |",
                    "|---------|-------|-----|",
                ]
            )
            for os_name, count in os_stats:
                percentage = (
                    count / unique_visitors * 100 if unique_visitors > 0 else 0
                )
                message_lines.append(
                    f"| {os_name or '未知'} | {count} | {percentage:.1f}% |"
                )
            message_lines.append("")

        # 设备类型分布
        if device_stats:
            message_lines.extend(
                [
                    "## 📱 设备类型分布",
                    "| 设备类型 | 用户数 | 占比 |",
                    "|---------|-------|-----|",
                ]
            )
            for device, count in device_stats:
                percentage = (
                    count / unique_visitors * 100 if unique_visitors > 0 else 0
                )
                message_lines.append(
                    f"| {device or '未知'} | {count} | {percentage:.1f}% |"
                )
            message_lines.append("")

        message_lines.extend(
            [
                "---",
                "📌 此消息由 ReadingList 系统自动发送",
            ]
        )

        message_content = "\n".join(message_lines)

        # 发送飞书富文本消息
        await send_feishu_message.kiq(
            message=message_content,
            msg_type="post",
            title=f"📊 每日访问统计 - {yesterday_str}",
        )
        logger.info("✅ 每日访问统计飞书消息已发送")

    except Exception as e:
        logger.error(f"❌ 发送每日统计飞书消息失败: {e!s}")
        raise e


@broker.task(
    schedule=[
        {
            "cron": "0 9 * * *",
            "schedule_id": "daily_todo_reminder",
            "cron_offset": "Asia/Shanghai",
        }
    ]
)
async def send_todo(context: Context = TaskiqDepends()):
    """每天早上9点发送待办事项提醒给用户"""
    todos = await context.state.redis.get("todos:1")
    url: str = get_settings().FEISHU_WEBHOOK_URL

    uncompleted = (
        [
            todo
            for todo in orjson.loads(todos)
            if todo.get("completed") is False
        ]
        if todos
        else []
    )
    if uncompleted:
        # 构建飞书消息内容
        message = FeishuMessageContent(
            msg_type="text",
            content={
                "text": f"您有 {len(uncompleted)} 个待办事项未完成，请及时处理！\n"
                + "\n".join(
                    [
                        f"- {todo['text']}- 截止日期: {todo['dueDate']}- 重要性: {todo['priority']}"
                        for todo in uncompleted
                    ]
                )
            },
        )
        try:
            async with httpx.AsyncClient() as client:
                await client.post(url, json=message.model_dump())
        except Exception as e:
            logger.error(f"Failed to send todo reminder: {e!r}")
