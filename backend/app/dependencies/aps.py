import json
from datetime import UTC, datetime

from app.configs.logger import logger
from app.dependencies.database import AsyncSessionFactory
from app.dependencies.redis import get_redis
from app.models.models import VisitorTrack


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
