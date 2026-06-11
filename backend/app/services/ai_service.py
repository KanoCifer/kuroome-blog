from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from app.core import logger
from app.core.agent import ArticleSummarizer
from app.schemas.aiagent import (
    ArticleSummaryRequest,
    ChatRequest,
    HistoryRequest,
)
from app.utils.sse import sse_event


class AiService:
    """AiService — 薄封装层，仅负责 try/except + SSE 包装。"""

    def __init__(self, summarizer: ArticleSummarizer) -> None:
        self.summarizer = summarizer

    async def summary_stream(
        self,
        payload: ArticleSummaryRequest,
        user_id: str,
        model: str | None = None,
    ) -> AsyncIterator[str]:
        try:
            async for chunk in self.summarizer.summarize(
                content=payload.content,
                title=payload.title,
                user_id=user_id,
                model_name=model,
            ):
                yield str(chunk)
        except Exception as exc:
            logger.error(f"❌ 文章总结失败: {exc!r}")
            yield "[ERROR] 文章总结失败,请稍后重试"

    async def chat_stream(
        self,
        payload: ChatRequest,
        user_id: str,
        model: str | None = None,
    ) -> AsyncIterator[str]:
        try:
            async for chunk in self.summarizer.chat(
                message=payload.message,
                session_id=payload.session_id,
                user_id=user_id,
                article_content=payload.article_content,
                article_title=payload.article_title,
                model_name=model,
            ):
                yield sse_event({"content": str(chunk), "is_end": False})
            yield sse_event({"content": "", "is_end": True})
        except ValueError as exc:
            yield sse_event({"content": f"[ERROR] {exc!r}", "is_end": True})
        except RuntimeError as exc:
            yield sse_event({"content": f"[ERROR] {exc!r}", "is_end": True})
        except Exception as exc:
            logger.error(f"❌ 对话失败: {exc!r}")
            yield sse_event(
                {"content": "[ERROR] 对话失败,请稍后重试", "is_end": True}
            )

    async def get_user_history(self, user_id: str) -> dict[str, list[dict]]:
        sessions = await self.summarizer.get_history(user_id=user_id)
        return {"sessions": sessions}

    def get_cached_summary(
        self,
        payload: HistoryRequest,
        user_id: str,
    ) -> dict[str, Any]:
        result = self.summarizer.get_cached_summary(
            user_id=user_id,
            title=payload.article_title,
            content=payload.article_content,
        )
        if result:
            return {"cached": True, **result}
        return {"cached": False}

    def get_cached_chat(
        self,
        payload: HistoryRequest,
        user_id: str,
    ) -> dict[str, Any]:
        result = self.summarizer.get_cached_chat(
            user_id=user_id,
            title=payload.article_title,
            content=payload.article_content,
        )
        if result:
            return {"cached": True, **result}
        return {"cached": False}

    def get_debug_sessions(self) -> dict[str, Any]:
        sessions = self.summarizer.get_agent_sessions()
        result = []
        for session in sessions[:5]:
            if isinstance(session, dict):
                result.append(session)
            else:
                result.append(
                    {
                        "session_id": getattr(session, "session_id", None),
                        "user_id": getattr(session, "user_id", None),
                        "run_count": len(getattr(session, "runs", []) or []),
                        "created_at": getattr(session, "created_at", None),
                    }
                )
        return {"total": len(sessions), "sessions": result}
