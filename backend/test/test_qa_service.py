"""``QaService`` 单元测试 — 不触碰网络 / 真实 DB。

覆盖两个契约：
- ``get_session``：会话不存在返回 None；存在时按时间升序返回 role/content，
  跳过 system 但保留 tool 消息。
- ``ask``：usage 落到 ``record_llm_usage``，LLM 异常转成 [ERROR] 结束帧。
"""

from __future__ import annotations

import pytest

from app.services.qa_service import QaService

pytestmark = pytest.mark.asyncio(loop_scope="session")


class _StubSession:
    def __init__(self, messages):
        self._messages = messages

    def get_messages(self, *, skip_roles=None, skip_statuses=None):
        return [m for m in self._messages if m.role not in (skip_roles or [])]


class _StubAgent:
    def __init__(self, session=None, run_output=None, raise_exc=None):
        self._session = session
        self._run_output = run_output
        self._raise_exc = raise_exc

    async def aget_session(self, session_id):
        return self._session

    def get_last_run_output(self):
        return self._run_output

    async def arun(self, *args, **kwargs):
        if self._raise_exc is not None:
            raise self._raise_exc
        # 空事件流：usage 从 get_last_run_output 取
        return
        yield  # pragma: no cover — 使本函数成为 async generator


class _Msg:
    def __init__(self, role, content, created_at):
        self.role = role
        self.content = content
        self.created_at = created_at


def _svc(agent) -> QaService:
    svc = QaService(instructions="test", usage_source="qa_test", tools=[])
    svc._new_agent = lambda: agent  # type: ignore[method-assign]
    return svc


async def test_get_session_returns_none_when_session_missing():
    assert await _svc(_StubAgent(session=None)).get_session("nope") is None


async def test_get_session_returns_none_for_blank_id():
    assert await _svc(_StubAgent(session=None)).get_session("   ") is None


async def test_get_session_keeps_tool_and_drops_system():
    session = _StubSession(
        [
            _Msg("system", "prompt", 1_700_000_000),
            _Msg("user", "问题", 1_700_000_001),
            _Msg("tool", "检索结果", 1_700_000_002),
            _Msg("assistant", "回答", 1_700_000_003),
        ]
    )

    result = await _svc(_StubAgent(session=session)).get_session("s1")

    assert [m["role"] for m in result] == ["user", "tool", "assistant"]
    assert [m["content"] for m in result] == ["问题", "检索结果", "回答"]
    assert result[0]["created_at"].startswith("2023-11-14")


async def test_ask_records_usage(monkeypatch):
    class _Metrics:
        input_tokens = 1
        output_tokens = 2
        total_tokens = 3

    class _Run:
        metrics = _Metrics()

    captured: dict = {}

    async def _fake_record(**kwargs):
        captured.update(kwargs)

    monkeypatch.setattr(
        "app.services.qa_service.record_llm_usage", _fake_record
    )

    chunks = [
        c
        async for c in _svc(_StubAgent(run_output=_Run())).ask(
            "问题", user_id="42", meta={"k": "v"}
        )
    ]

    assert chunks[-1]["is_end"] is True
    assert captured["source"] == "qa_test"
    assert captured["user_id"] == 42
    assert captured["total_tokens"] == 3
    assert captured["meta"] == {"k": "v"}


async def test_ask_rejects_blank_prompt():
    chunks = [
        c async for c in _svc(_StubAgent()).ask("   ")
    ]

    assert chunks == [
        {"type": "content", "content": "[ERROR] 问题不能为空", "is_end": True}
    ]


async def test_ask_converts_llm_failure_to_error_frame():
    chunks = [
        c
        async for c in _svc(
            _StubAgent(raise_exc=RuntimeError("gateway down"))
        ).ask("问题")
    ]

    assert chunks[-1]["is_end"] is True
    assert "问答服务暂时不可用" in chunks[-1]["content"]
