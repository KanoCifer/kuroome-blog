"""MongoDB dependency injection using Motor async driver.

This module provides FastAPI dependencies for MongoDB operations
using Motor for async MongoDB access.
"""

# Global MongoDB client instance

from pymongo import AsyncMongoClient

from app.configs.config import settings

if not settings.MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable is not set.")

client: AsyncMongoClient | None = None
mongo = None


async def init_mongo() -> None:
    """Initialize the MongoDB client connection."""
    global client, mongo

    client = AsyncMongoClient(settings.MONGO_URI)

    mongo = client["readinglist"]  # 替换为你的数据库名称


async def closeclient() -> None:
    """Close the MongoDB client connection."""
    global client

    if client is not None:
        await client.close()
        client = None


async def get_mongo_db():
    """
    mongodb依赖注入。
    """
    return mongo
