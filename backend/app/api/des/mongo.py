from fastapi import Request
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings

if not settings.MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable is not set.")

client: AsyncMongoClient | None = None
mongo = None


async def init_mongo(app) -> None:
    """Initialize the MongoDB client connection."""

    client = AsyncMongoClient(settings.MONGO_URI)

    mongo = client["readinglist"]

    app.state.client = client
    app.state.mongo = mongo


async def close_mongo_client(app) -> None:
    """Close the MongoDB client connection."""

    if app.state.client is not None:
        await app.state.client.close()
        app.state.client = None


async def get_mongo_db(request: Request) -> None | AsyncDatabase:
    """
    mongodb依赖注入。
    """
    return request.app.state.mongo
