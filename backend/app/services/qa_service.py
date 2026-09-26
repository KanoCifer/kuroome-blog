"""通用问答 LLM 服务 — 流式问答 + 会话回读。

问答能力本身与知识库无关：system prompt 与工具由调用方注入
（见 :mod:`app.services.rag_service`）。会话历史由 Agno 落 Postgres，
``get_session`` 按 ``session_id`` 回读该会话的完整消息流。
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from agno.agent import Agent, RunOutputEvent
from agno.db.postgres import AsyncPostgresDb
from agno.run.agent import ReasoningContentDeltaEvent

from app.core.llm_factory import (
    create_agent,
    create_llm_model,
    create_postgres_db,
)
from app.core.logger import logger
from app.services.llm_usage_service import record_llm_usage


class QaService:
    """通用问答：流式生成 + 按 session_id 回读会话。"""

    def __init__(
        self,
        *,
        instructions: str,
        usage_source: str,
        tools: list | None = None,
        db: AsyncPostgresDb | None = None,
    ) -> None:
        self.instructions = instructions
        self.usage_source = usage_source
        self.tools = tools
        # 会话必须落库，否则多轮上下文与 get_session 都无从谈起
        self.db = db or create_postgres_db()

    def _new_agent(self) -> Agent:
        """每个请求一个新 Agent：会话状态在 db 里，不依赖 Agent 实例缓存。"""
        return create_agent(
            model=create_llm_model(),
            instructions=self.instructions,
            tools=self.tools,
            db=self.db,
        )

    # ── 流式问答 ───────────────────────────────────────────────────── #

    async def ask(
        self,
        prompt: str,
        *,
        session_id: str | None = None,
        user_id: str | None = None,
        meta: dict | None = None,
    ) -> AsyncIterator[dict]:
        """流式生成。

        Yields:
            {type: "reasoning"|"content", content: str, is_end: bool}
        """
        if not prompt.strip():
            yield {
                "type": "content",
                "content": "[ERROR] 问题不能为空",
                "is_end": True,
            }
            return

        model = create_llm_model()
        agent = self._new_agent()

        start_time = time.monotonic()
        input_tokens = output_tokens = total_tokens = 0

        try:
            async for event in agent.arun(
                prompt,
                stream=True,
                stream_events=True,
                user_id=user_id,
                session_id=session_id,
            ):
                if (
                    isinstance(event, ReasoningContentDeltaEvent)
                    and event.reasoning_content
                ):
                    yield {
                        "type": "reasoning",
                        "content": str(event.reasoning_content),
                    }
                elif isinstance(event, RunOutputEvent) and event.content:
                    yield {"type": "content", "content": str(event.content)}

            # 从 agent 运行结果提取 usage
            run_output = agent.get_last_run_output()
            if run_output and run_output.metrics:
                metrics = run_output.metrics
                input_tokens = getattr(metrics, "input_tokens", 0) or 0
                output_tokens = getattr(metrics, "output_tokens", 0) or 0
                total_tokens = getattr(metrics, "total_tokens", 0) or 0

        except Exception as exc:
            logger.error(f"❌ 问答失败: {exc!r}")
            yield {
                "type": "content",
                "content": "[ERROR] 问答服务暂时不可用，请稍后重试",
                "is_end": True,
            }
            return
        finally:
            # 异步记录 usage，不阻塞响应
            duration_ms = round((time.monotonic() - start_time) * 1000)
            if total_tokens > 0:
                # user_id 形如 "123"（登录用户）或 "anon:ip"（匿名），仅前者可转 int
                numeric_id = int(user_id) if user_id and user_id.isdigit() else None
                await record_llm_usage(
                    source=self.usage_source,
                    model=model.id,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                    user_id=numeric_id,
                    duration_ms=duration_ms,
                    meta=meta or {},
                )

        yield {"type": "content", "content": "", "is_end": True}

    # ── 会话回读 ───────────────────────────────────────────────────── #

    async def get_session(self, session_id: str) -> list[dict] | None:
        """按 session_id 回读该会话的完整消息（时间升序）。会话不存在返回 None。"""
        if not session_id.strip():
            return None

        session = await self._new_agent().aget_session(session_id=session_id)
        if session is None:
            return None

        # 已在内存中的 session 上直接过滤，跳过 system 提示词，保留 tool 消息
        # （前端要展示工具调用轨迹）；skip_statuses=[] 让 error/paused 也返回。
        messages = session.get_messages(skip_roles=["system"], skip_statuses=[])
        return [
            {
                "role": m.role,
                "content": m.content if isinstance(m.content, str) else str(m.content),
                "created_at": (
                    datetime.fromtimestamp(m.created_at, tz=UTC).isoformat()
                    if m.created_at
                    else None
                ),
            }
            for m in messages
        ]
