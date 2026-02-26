import asyncio

from app.dependencies.celery.celery_app import celery_app
from app.dependencies.database import AsyncSessionFactory
from app.models.models import VisitorTrack


async def save_data_to_db(data):
    """一个示例函数用于将数据保存到数据库。
    这个函数将被 Celery 任务调用。

    Args:
        data (dict): 要保存的数据格式取决于你的数据库模型。
    """
    async with AsyncSessionFactory() as session:
        track_data = VisitorTrack(**data)
        session.add(track_data)
        await session.commit()


@celery_app.task
def batch_save_to_db(data):
    """一个Celery 任务用于批量保存数据到数据库。"""
    try:
        asyncio.run(save_data_to_db(data))
    except Exception as e:
        print(f"Error saving data to DB: {e}")
