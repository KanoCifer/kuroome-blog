import asyncio
import json
import time
from datetime import UTC, datetime
from itertools import repeat

import feedparser
import orjson
from sqlalchemy import select

from app.configs.logger import logger
from app.dependencies.database import AsyncSessionFactory
from app.dependencies.redis import get_redis
from app.models.mgmodel import RssArticle
from app.models.models import RssInfo, VisitorTrack
from app.schemas import VisitorData
from app.tasks.broker import broker


@broker.task(
    schedule=[
        {
            "interval": 1800,  # 每30分钟执行一次
            "schedule_id": "redis_to_db_migration",
        }
    ]
)
async def run_migration_job():
    """迁移Redis访客数据到PostgreSQL"""
    start_time = time.perf_counter()
    queue_key = "migration_queue"
    batch_size = 100  # 每批处理 100 条，可根据服务器性能调整
    processed_count = 0
    valid_items = []

    # 可根据需要保留或删除启动日志
    # logger.info(
    #     f"[MigrationJob] 🚀 Starting visitor data migration job | batch_size={batch_size}"
    # )

    try:
        async for redis in get_redis():
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
                parse_duration = time.perf_counter() - parse_start
                logger.warning(
                    f"[MigrationJob] JSON parsing failed | error={e!s} | parse_duration={parse_duration:.2f}s"
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
                    "error": "JSON parsing failed",
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
                    VisitorTrack(**data.model_dump())
                    for data in parsed_data_list
                ]

                session.add_all(track_objects)
                await session.commit()

                processed_count = len(track_objects)
                db_duration = time.perf_counter() - db_start

            # 完成统计
            duration = time.perf_counter() - start_time
            logger.info(
                f"[MigrationJob]✅ Completed | duration={duration:.2f}s | fetched={len(valid_items)} | migrated={processed_count} | fetch={fetch_duration:.2f}s | parse={parse_duration:.2f}s | db={db_duration:.2f}s"
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
        }
    ]
)
async def refresh_rss_feeds():
    """Daily RSS refresh at 8 AM for all users, saves new articles to MongoDB."""
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
                    # 在线程池中运行 feedparser.parse（同步操作）
                    loop = asyncio.get_event_loop()
                    feed = await loop.run_in_executor(
                        None, feedparser.parse, feed_url
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
                    for entry in feed.entries:
                        # 提取 guid
                        guid = entry.get("id") or entry.get("link", "")
                        if not guid:
                            continue

                        guid = str(guid)

                        # 检查文章是否已存在
                        existing = await RssArticle.find_one(
                            RssArticle.feed_url == feed_url,
                            RssArticle.guid == guid,
                        )

                        if existing:
                            continue

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
                            str(raw_author) if raw_author is not None else None
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

                        # 创建并插入新文章
                        new_article = RssArticle(
                            guid=guid,
                            feed_url=feed_url,
                            title=title,
                            link=link,
                            summary=summary,
                            content=content,
                            author=author,
                            published=pub_dt,
                            fetched_at=datetime.now(UTC),
                            read_by=[],
                        )
                        await new_article.insert()
                        saved_count += 1

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

        if failed_feeds:
            logger.warning(
                f"[RSSRefreshJob] Failed feeds: {[feed['url'] for feed in failed_feeds]}"
            )

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
        duration = time.perf_counter() - start_time
        logger.exception(
            f"[RSSRefreshJob] ❌ Job failed | duration={duration:.2f}s | error={e!s}"
        )
        return {
            "status": "failed",
            "error": str(e),
            "duration": f"{duration:.2f}s",
        }
