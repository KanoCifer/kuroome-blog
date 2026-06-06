from __future__ import annotations

import httpx


class WereadBaseService:
    """微信读书 HTTP 客户端基础设施"""

    base_url = "https://i.weread.qq.com/api/agent/gateway"
    headers = {"Content-Type": "application/json"}
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
    ):
        header, payload = await self._build_http_payload(
            user_id, api_name, extra
        )
        try:
            timeout = httpx.Timeout(15.0)
            async with httpx.AsyncClient(
                timeout=timeout, headers=header
            ) as client:
                res = await client.post(self.base_url, json=payload)
                res.raise_for_status()
                return res.json()
        except httpx.ConnectError:
            raise ValueError("网络连接失败") from None
        except httpx.HTTPError as exc:
            raise ValueError(f"HTTP 请求失败: {exc!s}") from exc
