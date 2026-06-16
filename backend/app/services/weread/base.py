from __future__ import annotations

import asyncio
from typing import Any, ClassVar

import httpx2

from app.core.exceptions import APIError


class WereadBaseService:
    """微信读书 HTTP 客户端基础设施"""

    base_url = "https://i.weread.qq.com/api/agent/gateway"
    headers: ClassVar[dict[str, str]] = {"Content-Type": "application/json"}
    skill_version = "1.0.3"

    def __init__(self, repo) -> None:
        self.repo = repo

    async def _build_http_payload(
        self,
        user_id: int,
        api_name: str,
        extra: dict | None = None,
    ):
        header = self.headers | {
            "Authorization": f"Bearer {await self.repo.get_user_token(user_id)}",
        }
        payload = {"api_name": api_name, "skill_version": self.skill_version}
        if extra:
            payload |= extra
        return header, payload

    async def _send_http_request(
        self,
        user_id: int,
        api_name: str,
        extra: dict | None = None,
        retries: int = 2,
    ) -> Any:
        header, payload = await self._build_http_payload(
            user_id, api_name, extra
        )
        last_exc: Exception | None = None
        for attempt in range(retries + 1):
            try:
                timeout = httpx2.Timeout(30.0)
                async with httpx2.AsyncClient(
                    timeout=timeout, headers=header
                ) as client:
                    res = await client.post(self.base_url, json=payload)
                    res.raise_for_status()
                    return res.json()
            except httpx2.ConnectError:
                raise APIError("网络连接失败") from None
            except httpx2.HTTPError as exc:
                last_exc = exc
                if attempt < retries:
                    await asyncio.sleep(1.0 * (attempt + 1))
                    continue
        raise APIError("请求失败，请稍后重试") from last_exc
