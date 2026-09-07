"""Service tests for ``app.services.nomu_service.NomuService``.

不触碰网络 / LLM：monkeypatch ``create_agent`` 返回 stub agent，验证
``optimize_prompt`` 的 ``tools=[]``、``use_json_mode`` + ``output_schema``
解析后的结构化返回、token 消耗的 usage 解析与 ``record_llm_usage`` 落库、
以及 LLM 失败时转抛 ``APIError(502)``。
"""

from __future__ import annotations

import pytest

from app.core.exceptions import APIError
from app.core.llm_prompts import NOMU_PROMPT_OPTIMIZE_INSTRUCTIONS
from app.schemas.nomu import PromptOptimizeResult
from app.services.nomu_service import NomuService

pytestmark = pytest.mark.asyncio(loop_scope="session")


class _StubMetrics:
    input_tokens = 10
    output_tokens = 20
    total_tokens = 30
    duration = 0.5


class _StubRun:
    def __init__(self, content, metrics=None):
        self.content = content
        self.metrics = metrics


class _StubAgent:
    def __init__(self, metrics=None, raise_exc=None):
        self.prompt = None
        self.output_schema = None
        self.metrics = metrics
        self.raise_exc = raise_exc

    async def arun(self, prompt, *, output_schema=None, **kwargs):
        self.prompt = prompt
        self.output_schema = output_schema
        if self.raise_exc is not None:
            raise self.raise_exc
        return _StubRun(output_schema(prompt="optimized"), self.metrics)


class _FakeModel:
    id = "Ling-2.6-1T"


async def test_optimize_prompt_passes_prompt_and_disables_tools(monkeypatch):
    agent = _StubAgent(metrics=None)
    captured: dict = {}

    def _fake_create_agent(
        *, model, instructions, db=None, tools=None, **kwargs
    ):
        captured["instructions"] = instructions
        captured["tools"] = tools
        captured["use_json_mode"] = kwargs.get("use_json_mode")
        return agent

    monkeypatch.setattr(
        "app.services.nomu_service.create_agent", _fake_create_agent
    )

    result = await NomuService(model=object()).optimize_prompt("a cup")

    assert result == PromptOptimizeResult(prompt="optimized")
    assert agent.prompt == "a cup"
    assert agent.output_schema is PromptOptimizeResult
    assert captured["tools"] == []
    assert captured["instructions"] == NOMU_PROMPT_OPTIMIZE_INSTRUCTIONS
    assert captured["use_json_mode"] is True


async def test_optimize_prompt_parses_usage_and_records(monkeypatch):
    agent = _StubAgent(metrics=_StubMetrics())
    captured: dict = {}

    def _fake_create_agent(
        *, model, instructions, db=None, tools=None, **kwargs
    ):
        return agent

    async def _fake_record_llm_usage(**kwargs):
        captured.update(kwargs)

    monkeypatch.setattr(
        "app.services.nomu_service.create_agent", _fake_create_agent
    )
    monkeypatch.setattr(
        "app.services.nomu_service.record_llm_usage", _fake_record_llm_usage
    )

    result = await NomuService(model=_FakeModel()).optimize_prompt(
        "a cup", user_id=7, credit_biz_id="biz-42"
    )

    assert result.usage is not None
    assert result.usage.model == "Ling-2.6-1T"
    assert result.usage.input_tokens == 10
    assert result.usage.output_tokens == 20
    assert result.usage.total_tokens == 30
    assert result.usage.duration_ms == 500

    assert captured["source"] == "nomu_prompt_optimize"
    assert captured["model"] == "Ling-2.6-1T"
    assert captured["user_id"] == 7
    assert captured["duration_ms"] == 500
    assert captured["meta"] == {
        "prompt_len": 5,
        "credit_biz_id": "biz-42",
    }


async def test_optimize_prompt_without_metrics_returns_no_usage(monkeypatch):
    agent = _StubAgent(metrics=None)
    called = False

    def _fake_create_agent(
        *, model, instructions, db=None, tools=None, **kwargs
    ):
        return agent

    async def _fake_record_llm_usage(**kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr(
        "app.services.nomu_service.create_agent", _fake_create_agent
    )
    monkeypatch.setattr(
        "app.services.nomu_service.record_llm_usage", _fake_record_llm_usage
    )

    result = await NomuService(model=object()).optimize_prompt("a cup")

    assert result.prompt == "optimized"
    assert result.usage is None
    assert called is False


async def test_optimize_prompt_llm_failure_raises_api_error(monkeypatch):
    agent = _StubAgent(raise_exc=RuntimeError("gateway down"))

    def _fake_create_agent(
        *, model, instructions, db=None, tools=None, **kwargs
    ):
        return agent

    monkeypatch.setattr(
        "app.services.nomu_service.create_agent", _fake_create_agent
    )

    with pytest.raises(APIError) as exc_info:
        await NomuService(model=object()).optimize_prompt("a cup")

    assert exc_info.value.code == 502
    assert "稍后重试" in exc_info.value.message
