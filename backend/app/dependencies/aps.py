import asyncio
import json
from datetime import UTC, datetime

import feedparser
from sqlalchemy import select

from app.configs.logger import logger
from app.dependencies.database import AsyncSessionFactory
from app.dependencies.redis import get_redis
from app.models.mgmodel import RssArticle
from app.models.models import RssInfo, VisitorTrack


async def run_migration_job():
    queue_key = "migration_queue"
    batch_size = 100  # 每批处理 100 条，可根据服务器性能调整
    processed_count = 0

    try:
        async for redis in get_redis():
            # 1. 批量从 Redis 取出数据 (使用 Pipeline 减少网络 IO)
            pipe = redis.pipeline()

            # 批量执行 POP
            for _ in range(batch_size):
                pipe.lpop(queue_key)

            # 执行并获取结果
            items = await pipe.execute()

            # 过滤掉 None (队列空了返回的就是 None)
            valid_items = [item for item in items if item is not None]

            if not valid_items:
                logger.info("No items to migrate from Redis.")
                return

            # 2. 批量解析 JSON
            try:
                parsed_data_list = [json.loads(item) for item in valid_items]
            except json.JSONDecodeError:
                # 注意：生产环境这里需要把解析失败的脏数据单独处理，不要丢回主队列
                logger.warning("Error parsing JSON data. Skipping batch.")
                return

            # 3. 处理时间字段，转换为 datetime 对象
            for data in parsed_data_list:
                if data["visit_time"] is not None:
                    data["visit_time"] = datetime.fromisoformat(
                        data["visit_time"]
                    ).replace(tzinfo=UTC)

            # 4. 批量写入数据库 (一次 Session, 一次 Commit)
            async with AsyncSessionFactory() as session:
                # 构建所有 ORM 对象
                track_objects = [
                    VisitorTrack(**data) for data in parsed_data_list
                ]

                # 批量添加
                session.add_all(track_objects)

                # 仅提交一次！
                await session.commit()

                processed_count = len(track_objects)
                logger.info(
                    f"Successfully migrated {processed_count} items from Redis to DB."
                )

    except Exception:
        # 【重要】发生异常时，把取出来的数据塞回 Redis 头部，防止数据丢失
        if "valid_items" in locals() and valid_items:
            # 注意要倒序塞回去，保证顺序不变
            for item in reversed(valid_items):
                await redis.lpush(queue_key, item)  # type: ignore


# RSS 动态刷新任务
async def refresh_rss_feeds():
    """Daily RSS refresh at 8 AM for all users, saves new articles to MongoDB."""
    logger.info("Starting daily RSS feed refresh...")
    try:
        async with AsyncSessionFactory() as session:
            # 查询所有不同的 feed_url
            result = await session.execute(select(RssInfo.rss_url).distinct())
            feed_urls = result.scalars().all()

        if not feed_urls:
            logger.info("No RSS feeds to refresh")
            return

        logger.info(f"Refreshing {len(feed_urls)} RSS feeds...")

        # 使用信号量限制并发数
        semaphore = asyncio.Semaphore(5)

        async def fetch_and_save_feed(feed_url: str):
            async with semaphore:
                try:
                    # 在线程池中运行 feedparser.parse（同步操作）
                    loop = asyncio.get_event_loop()
                    feed = await loop.run_in_executor(
                        None, feedparser.parse, feed_url
                    )

                    if feed.bozo != 0:
                        logger.warning(f"Failed to parse feed: {feed_url}")
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

                    logger.info(
                        f"RSS feed {feed_url}: saved {saved_count} new articles"
                    )
                    return saved_count

                except Exception as e:
                    logger.error(f"Error refreshing feed {feed_url}: {e!r}")
                    return 0

        # 并发刷新所有 feed
        tasks = [fetch_and_save_feed(url) for url in feed_urls]
        results = await asyncio.gather(*tasks)
        total_saved = sum(results)

        logger.info(
            f"Daily RSS refresh completed. Total new articles: {total_saved}"
        )

    except Exception as e:
        logger.error(f"Error in refresh_rss_feeds: {e!r}")
