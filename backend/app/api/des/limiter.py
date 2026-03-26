from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# 全局唯一的 limiter 实例
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)
