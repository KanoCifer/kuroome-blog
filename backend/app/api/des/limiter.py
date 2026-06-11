from fastapi import Request
from slowapi import Limiter

from app.core.config import settings


def client_key(request: Request) -> str:
    """限流 key：取 `X-Forwarded-For` 末段（最右侧的非空值），缺则退化到
    `request.client.host`（直连场景）。

    约定：反代使用 `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
    时，nginx 会把客户端原始头保留在前、再把 `$remote_addr` 追加在末尾。因此
    末段**永远是反代看到的真实来源 IP**，客户端伪造的首段被忽略。
    直连或无 XFF 时退回到 `request.client.host`。
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        last = xff.rsplit(",", 1)[-1].strip()
        if last:
            return last
    return get_remote_address(request)


def get_remote_address(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# 全局唯一的 limiter 实例
limiter = Limiter(key_func=client_key, storage_uri=settings.REDIS_URL)
