"""API tests for ``POST /v2/translate`` — 需登录 + 积分扣费 + 标准信封。

不触碰真实 LLM：把 ``state.translate_svc.translate`` 换成 stub。
限流：端点挂 ``@limiter.limit("20/minute")``，key 按 IP（``client_key``）。
测试请求走真实 Redis（本地 6379），单测内 2 次请求远低于阈值。
积分相关的 402/退款/幂等断言集中在 test_credit_api.py。
"""

from __future__ import annotations

import pytest

from app.schemas.translate import TranslateResult

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_translate_endpoint_success(api_app, api_client, billing):
    calls: list[dict] = []

    async def _fake_translate(text, target_lang, user_id=None, **kwargs):
        calls.append({"text": text, "user_id": user_id, **kwargs})
        return TranslateResult(text="你好，世界")

    api_app.state.services.translate_svc.translate = _fake_translate

    resp = await api_client.post(
        "/v2/translate",
        json={"text": "hello world", "targetLanguage": "中文"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["message"] == "success"
    # 登录态：user_id 必有；积分幂等键（服务端 uuid4 兜底）透传给服务层
    assert len(calls) == 1
    assert calls[0]["user_id"] == billing
    assert calls[0]["credit_biz_id"]
    assert body["data"] == {
        "text": "你好，世界",
        "usage": None,
        "credits_spent": 0.1,  # translate seed 10 厘 = 0.1 分
    }


async def test_translate_endpoint_requires_auth(api_app, api_client):
    """未登录（无 Authorization）→ 401：摘掉 conftest 的 manager 覆写。"""
    from app.api.des.auth import get_current_user

    api_app.dependency_overrides.pop(get_current_user, None)
    resp = await api_client.post(
        "/v2/translate",
        json={"text": "hello world", "targetLanguage": "中文"},
    )
    assert resp.status_code == 401


async def test_translate_endpoint_requires_text(api_app, api_client, api_user):
    resp = await api_client.post(
        "/v2/translate",
        json={"text": "", "targetLanguage": "中文"},
    )
    assert resp.status_code == 422
