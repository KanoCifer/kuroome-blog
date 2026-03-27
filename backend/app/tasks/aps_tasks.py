import json
import time
from datetime import UTC, datetime, timedelta
from itertools import repeat

import orjson
from redis.asyncio import Redis as AsyncRedis
from taskiq import Context, TaskiqDepends

from app.api.des.db import AsyncSessionFactory
from app.core.config import get_settings
from app.core.logger import logger
from app.models.models import VisitorTrack
from app.schemas import VisitorData
from app.tasks.broker import broker
from app.tasks.feishu_task import send_feishu_message
from app.utils import get_redis_lock


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
    queue_key = "app:migration_queue"
    batch_size = 200  # 每批处理 200 条，可根据服务器性能调整
    processed_count = 0
    valid_items = []

    async with get_redis_lock(
        redis=context.state.redis, key="migration_lock", ttl=300
    ):
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
                track_objects: list[VisitorTrack] = []

                # 字段最大长度映射 (防止 StringDataRightTruncationError)
                max_lengths = {
                    "visitor_id": 100,
                    "page_url": 200,
                    "page_path": 200,
                    "referrer": 200,
                    "screen_resolution": 100,
                    "language": 50,
                    "ip_address": 100,
                    "browser_name": 100,
                    "browser_version": 100,
                    "os_name": 100,
                    "os_version": 100,
                    "cpu": 50,
                    "device_type": 20,
                }

                for data in parsed_data_list:
                    data_dict = data.model_dump()
                    # 截断字段以防超出数据库字段长度限制
                    for field, max_len in max_lengths.items():
                        value = data_dict.get(field)
                        if (
                            value
                            and isinstance(value, str)
                            and len(value) > max_len
                        ):
                            data_dict[field] = value[:max_len]

                    track_objects.append(VisitorTrack(**data_dict))

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
async def refresh_rss_feeds(context: Context = TaskiqDepends()):
    """Daily RSS refresh at 10:00 (Asia/Shanghai) for all users."""
    start_time = time.perf_counter()
    logger.info("[RSSRefreshJob] 🔄 Starting RSS feed refresh job")

    try:
        from app.core.container import get_rss_service

        async with get_rss_service(context.state.redis) as rss_service:
            stats = await rss_service.refresh_all_feeds()

        duration = time.perf_counter() - start_time
        logger.info(
            f"[RSSRefreshJob] ✅ Job completed | duration={duration:.2f}s | "
            f"total_feeds={stats['total_feeds']} | success={stats['success']} | "
            f"failed={stats['failed']} | new_articles={stats['new_articles']}"
        )

        if stats["total_feeds"] == 0:
            message = "RSS 刷新完成，但没有配置任何 RSS 源。请前往设置页面添加 RSS 源。"
        else:
            message = (
                f"✅RSS 刷新完成！\n\n"
                f"总 RSS 源: {stats['total_feeds']}\n"
                f"成功刷新: {stats['success']}\n"
                f"失败: {stats['failed']}\n"
                f"新增文章: {stats['new_articles']}\n"
                f"总耗时: {duration:.2f}秒"
            )

        try:
            await send_feishu_message.kiq(
                message=message, msg_type="post", title="✅Rss 刷新完成通知"
            )
        except Exception as e:
            logger.error(f"Failed to send Feishu notification: {e!r}")

        return {
            "status": "success",
            **stats,
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
async def send_daily_summary(
    context: Context = TaskiqDepends(),
):
    """每天早上8点发送前一天的访问统计摘要飞书消息给管理员"""
    settings = get_settings()

    # 检查飞书webhook配置
    if not settings.FEISHU_WEBHOOK_URL:
        logger.warning("⚠️ 未配置飞书webhook，跳过发送每日统计飞书消息")
        return

    # 计算昨天的时间 (UTC)
    yesterday = (datetime.now(UTC) - timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    try:
        from app.core.container import get_monitor_service

        async with get_monitor_service(context.state.redis) as monitor_service:
            stats = await monitor_service.get_daily_summary(yesterday)

        total_visits = stats["total_visits"]
        unique_visitors = stats["unique_visitors"]
        unique_ips = stats["unique_ips"]
        top_pages = stats["top_pages"]
        browser_stats = stats["browser_stats"]
        os_stats = stats["os_stats"]
        device_stats = stats["device_stats"]
        yesterday_str = stats["date"]

        # 构建纯文本消息
        lines = []
        lines.append("📈 核心指标")
        lines.append(f"• 总访问量: {total_visits} 次")
        lines.append(f"• 独立访客: {unique_visitors} 人")
        lines.append(f"• 独立IP: {unique_ips} 个\n")

        if top_pages:
            lines.append("🔥 热门页面 Top 5")
            for item in top_pages:
                count = item["count"]
                percentage = (
                    count / total_visits * 100 if total_visits > 0 else 0
                )
                lines.append(
                    f"• {item['page_path']}: {count} 次 ({percentage:.1f}%)"
                )
            lines.append("")

        if browser_stats:
            lines.append("🌐 浏览器分布")
            for item in browser_stats:
                count = item["count"]
                percentage = (
                    count / unique_visitors * 100 if unique_visitors > 0 else 0
                )
                lines.append(
                    f"• {item['browser_name'] or '未知'}: {count} 人 ({percentage:.1f}%)"
                )
            lines.append("")

        if os_stats:
            lines.append("💻 操作系统分布")
            for item in os_stats:
                count = item["count"]
                percentage = (
                    count / unique_visitors * 100 if unique_visitors > 0 else 0
                )
                lines.append(
                    f"• {item['os_name'] or '未知'}: {count} 人 ({percentage:.1f}%)"
                )
            lines.append("")

        if device_stats:
            lines.append("📱 设备类型分布")
            for item in device_stats:
                count = item["count"]
                percentage = (
                    count / unique_visitors * 100 if unique_visitors > 0 else 0
                )
                lines.append(
                    f"• {item['device_type'] or '未知'}: {count} 人 ({percentage:.1f}%)"
                )
            lines.append("")

        lines.append("────────────────")
        lines.append("📌 此消息由 BOT 自动发送")
        message = "\n".join(lines)

        # 通过 send_feishu_message 发送
        await send_feishu_message.kiq(
            message=message,
            msg_type="post",
            title=f"📊 每日访问统计 - {yesterday_str}",
        )

    except Exception as e:
        logger.error(f"❌ 发送每日统计飞书消息失败: {e!s}")
        raise


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
        await send_feishu_message.kiq(
            message=f"您有 {len(uncompleted)} 个待办事项未完成，请及时处理！\n"
            + "\n".join(
                [
                    f"- {todo['text']}- 截止日期: {todo['dueDate']}- 重要性: {todo['priority']}"
                    for todo in uncompleted
                ]
            ),
            msg_type="post",
            title="📌 待办事项提醒",
        )
