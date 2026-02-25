"""MongoDB dependency injection using Motor async driver.

This module provides FastAPI dependencies for MongoDB operations
using Motor for async MongoDB access.
"""

# Global MongoDB client instance

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.configs.config import settings

if not settings.MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable is not set.")

client: AsyncMongoClient | None = None
mongo = None


async def init_mongo(app) -> None:
    """Initialize the MongoDB client connection."""

    client = AsyncMongoClient(settings.MONGO_URI)

    mongo = client["readinglist"]  # 替换为你的数据库名称

    app.state.client = client
    app.state.mongo = mongo


async def closeclient(app) -> None:
    """Close the MongoDB client connection."""

    if app.state.client is not None:
        await app.state.client.close()
        app.state.client = None


async def get_mongo_db(app) -> None | AsyncDatabase:
    """
    mongodb依赖注入。
    """
    return app.state.mongo
