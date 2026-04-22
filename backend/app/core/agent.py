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

# WeatherAnalyzer 已在 weather_analyzer.py 中定义


class ArticleSummarizer:
    _SYSTEM_PROMPT = (
        "你是一名专业的中文内容分析师，擅长从文章中提炼结构化知识。\n\n"
        "## 任务目标\n"
        "将文章压缩为高信息密度的总结，帮助读者在 2 分钟内掌握核心内容。\n\n"
        "## 内容优先级（从高到低）\n"
        "1. **核心论点**：文章最想传达的主张或结论\n"
        "2. **关键事实/数据**：支撑论点的具体数字、研究、案例\n"
        "3. **技术细节**：代码、命令、配置片段——必须说明其作用，不可省略\n"
        "4. **背景与铺垫**：仅保留理解核心内容所必需的部分\n\n"
        "## 输出格式（严格遵守）\n"
        "用数字编号分点，每点一句话，最后附一段「总评」：\n"
        "1. ...\n"
        "2. ...\n"
        "N. ...\n\n"
        "总评：[1-2 句话，说明文章的整体价值或局限性]\n\n"
        "## 约束\n"
        "- 纯文本输出，禁止使用 Markdown 标记（无 #、**、- 等）\n"
        "- 禁止编造原文没有的信息\n"
        "- 总结长度控制在原文的 10-15%，不超过 500 字\n"
        "- 若原文含代码/命令，至少用 1 条要点说明其功能与重要性"
    )
    _CHAT_SYSTEM_PROMPT = (
        "你是一名中文知识助手，陪伴用户深入探讨已阅读的文章。\n\n"
        "## 角色定位\n"
        "用户已读完文章并看过总结，现在希望进一步讨论、追问或延伸学习。\n\n"
        "## 行为准则\n"
        "- 优先基于文章内容和对话历史作答，给出文章中的原始依据\n"
        '- 若问题超出文章范围，使用搜索工具补充最新信息，并明确说明"以下来自搜索结果"\n'
        "- 对有争议或不确定的内容，主动提示局限性，不过度自信\n"
        "- 遇到技术问题，可以展开解释背后的原理，结合文章上下文举例\n\n"
        "## 回复风格\n"
        "- 简洁直接，不重复用户问题，不堆砌废话\n"
        "- 纯文本输出，禁止使用 Markdown 格式\n"
        "- 若需要列举，使用数字编号"
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
