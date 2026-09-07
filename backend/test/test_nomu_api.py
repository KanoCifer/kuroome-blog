"""API tests for ``POST /v2/nomu/prompt-optimize`` — 匿名可用、标准信封。

不触碰真实 LLM：把 ``state.nomu_svc.optimize_prompt`` 换成 stub。
限流：端点挂 ``@limiter.limit("20/minute")``，测试请求远低于阈值。
"""

from __future__ import annotations

import pytest

from app.schemas.nomu import PromptOptimizeResult
from app.schemas.translate import UsageMetrics

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_prompt_optimize_endpoint_anonymous(api_app, api_client):
    async def _fake_optimize(prompt, user_id=None):
        assert prompt == "a cup"
        assert user_id is None  # 匿名请求 user 为 None
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
    assert body["data"] == {
        "prompt": "a ceramic cup on a marble table, studio lighting",
        "usage": {
            "model": "Ling-2.6-1T",
            "input_tokens": 10,
            "output_tokens": 20,
            "total_tokens": 30,
            "duration_ms": 500,
        },
    }


async def test_prompt_optimize_endpoint_requires_prompt(api_app, api_client):
    resp = await api_client.post(
        "/v2/nomu/prompt-optimize", json={"prompt": ""}
    )
    assert resp.status_code == 422


async def test_prompt_optimize_llm_failure_structured_error(
    api_app, api_client
):
    from app.core.exceptions import APIError

    async def _fake_optimize(prompt, user_id=None):
        raise APIError("提示词优化服务暂时不可用，请稍后重试", code=502)

    api_app.state.services.nomu_svc.optimize_prompt = _fake_optimize

    resp = await api_client.post(
        "/v2/nomu/prompt-optimize", json={"prompt": "a cup"}
    )

    assert resp.status_code == 502
    body = resp.json()
    assert "稍后重试" in body["message"]
