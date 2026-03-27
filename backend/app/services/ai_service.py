from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

from app.core import logger
from app.core.agent import ArticleSummarizer, article_summarizer
from app.repositories.ai_repo import AiRepo
from app.schemas.aiagent import (
    ArticleSummaryRequest,
    ChatRequest,
    HistoryRequest,
)


class AiService:
    def __init__(
        self,
        repo: AiRepo,
        summarizer: ArticleSummarizer = article_summarizer,
    ) -> None:
        self.repo = repo
        self.summarizer = summarizer

    @staticmethod
    def _to_sse_event(content: str, is_end: bool) -> str:
        data = {"content": content, "is_end": is_end}
        return f"data:{json.dumps(data, ensure_ascii=False)}\n\n"

    async def summary_stream(
        self,
        payload: ArticleSummaryRequest,
        user_id: str,
    ) -> AsyncIterator[str]:
        try:
            async for chunk in self.summarizer.run_summarization_astream(
                content=payload.content,
                title=payload.title,
                user_id=user_id,
            ):
                yield self._to_sse_event(str(chunk), False)
            yield self._to_sse_event("", True)
        except ValueError as exc:
            yield self._to_sse_event(f"[ERROR] {exc!r}", True)
        except RuntimeError as exc:
            yield self._to_sse_event(f"[ERROR] {exc!r}", True)
        except Exception as exc:
            logger.error(f"❌ 文章总结失败: {exc!r}")
            yield self._to_sse_event("[ERROR] 文章总结失败,请稍后重试", True)

    async def chat_stream(
        self,
        payload: ChatRequest,
        user_id: str,
    ) -> AsyncIterator[str]:
        try:
            async for chunk in self.summarizer.chat_stream(
                message=payload.message,
                session_id=payload.session_id,
                user_id=user_id,
                article_content=payload.article_content,
                article_title=payload.article_title,
            ):
                yield self._to_sse_event(str(chunk), False)
            yield self._to_sse_event("", True)
        except ValueError as exc:
            yield self._to_sse_event(f"[ERROR] {exc!r}", True)
        except RuntimeError as exc:
            yield self._to_sse_event(f"[ERROR] {exc!r}", True)
        except Exception as exc:
            logger.error(f"❌ 对话失败: {exc!r}")
            yield self._to_sse_event("[ERROR] 对话失败,请稍后重试", True)

    async def get_user_history(self, user_id: str) -> dict[str, list[dict]]:
        sessions = await self.summarizer.get_user_sessions(user_id=user_id)
        return {"sessions": sessions}

    async def get_cached_summary(
        self,
        payload: HistoryRequest,
        user_id: str,
    ) -> dict[str, Any]:
        result = await self.summarizer.get_summary_session(
            user_id=user_id,
            title=payload.article_title,
            content=payload.article_content,
        )
        if result:
            return {"cached": True, **result}
        return {"cached": False}

    async def get_cached_chat(
        self,
        payload: HistoryRequest,
        user_id: str,
    ) -> dict[str, Any]:
        result = await self.summarizer.get_chat_session(
            user_id=user_id,
            title=payload.article_title,
            content=payload.article_content,
        )
        if result:
            return {"cached": True, **result}
        return {"cached": False}

    def get_debug_sessions(self) -> dict[str, Any]:
        sessions = self.repo.get_agent_sessions()
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
