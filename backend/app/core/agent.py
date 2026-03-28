from __future__ import annotations

import hashlib
import re
from collections.abc import AsyncIterator

from agno.agent import Agent, RunOutputEvent
from agno.db.base import SessionType
from agno.db.redis import RedisDb
from agno.models.openai.like import OpenAILike
from agno.tools.websearch import WebSearchTools

from app.core.config import settings
from app.core.logger import logger
from app.schemas.aiagent import WeatherAnalysisInput


class ArticleSummarizer:
    _SYSTEM_PROMPT = (
        "你是一个擅长提炼文章重点的中文助手。"
        "请输出简洁、准确、可读性强的总结，优先保留：主题、核心观点、关键事实/结论。"
        "如果原文包含代码、配置片段、命令或技术实现细节，必须在总结中单独提及其作用与关键点。"
        "输出为纯文本，不要使用 Markdown 标题，不要编造原文没有的信息。"
    )
    _CHAT_SYSTEM_PROMPT = (
        "你是一个擅长与用户讨论文章内容的中文助手。"
        "用户已经收到了一篇文章的总结，现在想和你深入讨论。"
        "请基于对话历史和文章内容，准确、简洁地回答用户的问题。"
        "如果问题超出文章范围，请使用搜索工具。"
        "输出为纯文本，不要使用 Markdown 标题。"
    )
    _MAX_INPUT_CHARS = 128_000
    DB = RedisDb(db_url=settings.REDIS_URL)

    def __init__(self) -> None:
        self._model = OpenAILike(
            id="Ling-2.5-1T",
            api_key=settings.API_KEY,
            base_url="https://api.tbox.cn/api/llm/v1",
            temperature=1,
            timeout=60,
        )

        self._agent = Agent(
            model=self._model,
            instructions=self._SYSTEM_PROMPT,
            tools=[WebSearchTools(backend="bing")],
            db=ArticleSummarizer.DB,
            add_history_to_context=True,
            num_history_runs=10,
        )

        self._chat_agent = Agent(
            model=self._model,
            instructions=self._CHAT_SYSTEM_PROMPT,
            tools=[WebSearchTools(backend="bing")],
            db=ArticleSummarizer.DB,
            add_history_to_context=True,
            num_history_runs=10,
        )

    def _build_user_prompt(
        self, normalized_content: str, title: str | None = None
    ) -> str:
        user_prompt = (
            "请总结下面文章内容，按要点进行总结，最后补一段总评。"
            "如果正文里出现代码/命令/配置，请至少用 1 条要点说明代码做了什么、为什么重要。\n\n"
        )
        if title:
            user_prompt += f"标题：{title}\n\n"
        user_prompt += f"正文：{normalized_content}"
        return user_prompt

    def _normalize_content(self, content: str) -> str:
        # 去掉简单 HTML 标签并收敛连续空白，降低 token 开销
        text = re.sub(r"<[^>]+>", " ", content)
        text = re.sub(r"\s+", " ", text).strip()
        return text[: self._MAX_INPUT_CHARS]

    @staticmethod
    def _hash_article(title: str | None, content: str) -> str:
        text = f"{title or ''}:{content[:5000]}"
        return hashlib.md5(text.encode()).hexdigest()[:16]

    @staticmethod
    def _article_session_id(
        user_id: str, article_hash: str, prefix: str = "summary"
    ) -> str:
        return f"{prefix}:{user_id}:{article_hash}"

    async def get_summary_session(
        self, user_id: str, title: str | None, content: str
    ) -> dict | None:
        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "summary")
        try:
            all_sessions = ArticleSummarizer.DB.get_sessions(
                session_type=SessionType.AGENT
            )
            for session in all_sessions:
                sid = (
                    session.get("session_id")
                    if isinstance(session, dict)
                    else getattr(session, "session_id", None)
                )
                if sid != session_id:
                    continue
                runs = (
                    session.get("runs", [])
                    if isinstance(session, dict)
                    else getattr(session, "runs", [])
                )
                if not runs:
                    return None
                last_run = runs[-1]
                response = (
                    last_run.get("content")
                    if isinstance(last_run, dict)
                    else getattr(last_run, "content", None)
                    or getattr(last_run, "response", None)
                )
                if response:
                    return {
                        "session_id": session_id,
                        "summary": response,
                        "created_at": (
                            session.get("created_at")
                            if isinstance(session, dict)
                            else getattr(session, "created_at", None)
                        ),
                        "updated_at": (
                            session.get("updated_at")
                            if isinstance(session, dict)
                            else getattr(session, "updated_at", None)
                        ),
                    }
            logger.debug(f"无缓存 session: {session_id}")
        except Exception as e:
            logger.warning(f"获取总结缓存失败: {e}")
        return None

    async def get_chat_session(
        self, user_id: str, title: str | None, content: str
    ) -> dict | None:
        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "chat")
        try:
            all_sessions = ArticleSummarizer.DB.get_sessions(
                session_type=SessionType.AGENT
            )
            for session in all_sessions:
                sid = (
                    session.get("session_id")
                    if isinstance(session, dict)
                    else getattr(session, "session_id", None)
                )
                if sid != session_id:
                    continue
                runs = (
                    session.get("runs", [])
                    if isinstance(session, dict)
                    else getattr(session, "runs", [])
                )
                if not runs:
                    return None
                messages = []
                for run in runs:
                    msg = (
                        run.get("message")
                        if isinstance(run, dict)
                        else getattr(run, "message", None)
                        or getattr(run, "input", None)
                    )
                    resp = (
                        run.get("content")
                        if isinstance(run, dict)
                        else getattr(run, "content", None)
                        or getattr(run, "response", None)
                    )
                    if msg:
                        messages.append({"role": "user", "content": msg})
                    if resp:
                        messages.append({"role": "assistant", "content": resp})
                return {
                    "session_id": session_id,
                    "messages": messages,
                    "created_at": (
                        session.get("created_at")
                        if isinstance(session, dict)
                        else getattr(session, "created_at", None)
                    ),
                    "updated_at": (
                        session.get("updated_at")
                        if isinstance(session, dict)
                        else getattr(session, "updated_at", None)
                    ),
                }
            logger.debug(f"无对话缓存: {session_id}")
        except Exception as e:
            logger.warning(f"获取对话历史失败: {e}")
        return None

    async def get_user_sessions(self, user_id: str) -> list[dict]:
        try:
            all_sessions = ArticleSummarizer.DB.get_sessions(
                session_type=SessionType.AGENT
            )
            user_sessions = []
            for session in all_sessions:
                session_user_id = (
                    session.get("user_id")
                    if isinstance(session, dict)
                    else getattr(session, "user_id", None)
                )
                if session_user_id != user_id:
                    continue
                runs = (
                    session.get("runs", [])
                    if isinstance(session, dict)
                    else getattr(session, "runs", [])
                )
                if not runs:
                    continue
                last_run = runs[-1]
                last_msg = (
                    last_run.get("message")
                    if isinstance(last_run, dict)
                    else getattr(last_run, "message", None)
                )
                last_resp = (
                    last_run.get("response")
                    if isinstance(last_run, dict)
                    else getattr(last_run, "response", None)
                    or getattr(last_run, "content", None)
                )
                session_id = (
                    session.get("session_id")
                    if isinstance(session, dict)
                    else getattr(session, "session_id", None)
                )
                user_sessions.append(
                    {
                        "session_id": session_id,
                        "user_id": user_id,
                        "last_message": last_msg[:100] if last_msg else None,
                        "last_response_preview": (
                            last_resp[:200] if last_resp else None
                        ),
                        "run_count": len(runs),
                        "created_at": (
                            session.get("created_at")
                            if isinstance(session, dict)
                            else getattr(session, "created_at", None)
                        ),
                        "updated_at": (
                            session.get("updated_at")
                            if isinstance(session, dict)
                            else getattr(session, "updated_at", None)
                        ),
                    }
                )
            user_sessions.sort(
                key=lambda x: x.get("updated_at") or 0, reverse=True
            )
            return user_sessions
        except Exception as e:
            logger.error(f"获取用户 session 列表失败: {e}")
            return []

    async def summarize_article_stream(
        self, content: str, title: str | None = None
    ) -> AsyncIterator[str]:
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        normalized = self._normalize_content(content)
        if not normalized:
            raise ValueError("文章内容不能为空")

        user_prompt = self._build_user_prompt(
            normalized_content=normalized,
            title=title,
        )

        async for event in self._agent.arun(user_prompt, stream=True):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)

    async def run_summarization_astream(
        self, content: str, user_id: str, title: str | None = None
    ) -> AsyncIterator[str]:
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        normalized = self._normalize_content(content)
        if not normalized:
            raise ValueError("文章内容不能为空")

        user_prompt = self._build_user_prompt(
            normalized_content=normalized,
            title=title,
        )

        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "summary")

        async for event in self._agent.arun(
            user_prompt, stream=True, user_id=user_id, session_id=session_id
        ):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)

    async def chat_stream(
        self,
        message: str,
        user_id: str,
        session_id: str,
        article_content: str | None = None,
        article_title: str | None = None,
    ) -> AsyncIterator[str]:
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        if not message.strip():
            raise ValueError("消息不能为空")

        context_prefix = ""
        if article_content:
            normalized = self._normalize_content(article_content)
            if normalized:
                context_prefix = (
                    f"[文章上下文]\n标题: {article_title or '无标题'}\n"
                    f"内容摘要: {normalized[:2000]}...\n\n"
                )

        full_message = f"{context_prefix}用户问题: {message}"

        async for event in self._chat_agent.arun(
            full_message,
            session_id=session_id,
            user_id=user_id,
            stream=True,
        ):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)


article_summarizer = ArticleSummarizer()


class WeatherAnalyzer:
    _SYSTEM_PROMPT = (
        "你是一个天气分析助手，能够根据用户提供的天气信息进行分析和建议, 提供是否适合外出/路亚/钓鱼的建议。"
        "请根据用户输入的天气数据，提供准确的分析和实用的建议。"
        "输出为纯文本，不要使用 Markdown 标题。"
    )
    DB = RedisDb(db_url=settings.REDIS_URL)

    def __init__(self) -> None:
        self._model = OpenAILike(
            id="Ling-2.5-1T",
            api_key=settings.API_KEY,
            base_url="https://api.tbox.cn/api/llm/v1",
            temperature=0.8,
            timeout=30,
        )

        self._agent = Agent(
            model=self._model,
            instructions=self._SYSTEM_PROMPT,
            db=WeatherAnalyzer.DB,
            tools=[WebSearchTools(backend="bing")],
            add_history_to_context=True,
            num_history_runs=5,
        )

    def _build_user_prompt(self, weather_data: WeatherAnalysisInput) -> str:
        return f"请分析以下天气数据，并提供是否适合外出/路亚/钓鱼的建议：\n\n{weather_data}"

    async def analyze_weather_stream(
        self, weather_data: WeatherAnalysisInput
    ) -> AsyncIterator[str]:
        if not settings.API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        data = (
            str(weather_data)
            if isinstance(weather_data, WeatherAnalysisInput)
            else weather_data
        )

        if not data.strip():
            raise ValueError("天气数据不能为空")

        user_prompt = self._build_user_prompt(weather_data)

        async for event in self._agent.arun(user_prompt, stream=True):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)


weather_analyzer = WeatherAnalyzer()
