"""API tests for ``POST /v2/nomu/prompt-optimize`` — 需登录 + 标准信封。

不触碰真实 LLM：把 ``state.nomu_svc.optimize_prompt`` 换成 stub。
限流：端点挂 ``@limiter.limit("20/minute")``，测试请求远低于阈值。
积分相关的 402/退款/幂等断言集中在 test_credit_api.py。
"""

from __future__ import annotations

import pytest

from app.schemas.nomu import PromptOptimizeResult
from app.schemas.translate import UsageMetrics

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_prompt_optimize_endpoint_success(api_app, api_client, billing):
    calls: list[dict] = []

    async def _fake_optimize(prompt, user_id=None, **kwargs):
        calls.append({"prompt": prompt, "user_id": user_id, **kwargs})
        return PromptOptimizeResult(
            prompt="a ceramic cup on a marble table, studio lighting",
            usage=UsageMetrics(
                model="Ling-2.6-1T",
                input_tokens=10,
                output_tokens=20,
                total_tokens=30,
                duration_ms=500,
            ),
        )

    api_app.state.services.nomu_svc.optimize_prompt = _fake_optimize

    resp = await api_client.post(
        "/v2/nomu/prompt-optimize", json={"prompt": "a cup"}
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["message"] == "success"
    # 登录态：user_id 必有；积分幂等键（服务端 uuid4 兜底）透传给服务层
    assert len(calls) == 1
    assert calls[0]["user_id"] == billing
    assert calls[0]["credit_biz_id"]
    assert body["data"] == {
        "prompt": "a ceramic cup on a marble table, studio lighting",
        "usage": {
            "model": "Ling-2.6-1T",
            "input_tokens": 10,
            "output_tokens": 20,
            "total_tokens": 30,
            "duration_ms": 500,
        },
        "credits_spent": 0.2,  # nomu seed 20 厘 = 0.2 分
    }


async def test_prompt_optimize_endpoint_requires_auth(api_app, api_client):
    """未登录（无 Authorization）→ 401：摘掉 conftest 的 manager 覆写。"""
    from app.api.des.auth import get_current_user

    api_app.dependency_overrides.pop(get_current_user, None)
    resp = await api_client.post(
        "/v2/nomu/prompt-optimize", json={"prompt": "a cup"}
    )
    assert resp.status_code == 401


async def test_prompt_optimize_endpoint_requires_prompt(
    api_app, api_client, api_user
):
    resp = await api_client.post(
        "/v2/nomu/prompt-optimize", json={"prompt": ""}
    )
    assert resp.status_code == 422
