from slowapi import Limiter
from slowapi.util import get_remote_address

# 全局唯一的 limiter 实例
limiter = Limiter(
    key_func=get_remote_address, storage_uri="redis://localhost:6379/1"
)
