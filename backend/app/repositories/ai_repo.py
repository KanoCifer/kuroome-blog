from __future__ import annotations

from agno.db.base import SessionType

from app.core.agent import ArticleSummarizer


class AiRepo:
    def get_agent_sessions(self):
        return ArticleSummarizer.DB.get_sessions(
            session_type=SessionType.AGENT
        )
