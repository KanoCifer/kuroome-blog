from __future__ import annotations

import hashlib
import re
from collections.abc import AsyncIterator
from typing import Any, ClassVar

from agno.agent import Agent, RunOutputEvent
from agno.db.base import SessionType
from agno.db.redis import RedisDb
from agno.models.openai.like import OpenAILike
from agno.tools.websearch import WebSearchTools

from app.core.config import get_settings
from app.core.logger import logger

# WeatherAnalyzer 已在 weather_analyzer.py 中定义


class ArticleSummarizer:
    _MODEL_MAP: ClassVar[dict[str, str]] = {
        "Ring 2.6": "Ring-2.6-1T",
        "Ling 2.6": "Ling-2.6-1T",
    }

    _SYSTEM_PROMPT = (
        "你是一名专业的中文内容分析师，擅长从文章中提炼结构化知识。\n\n"
        "## 任务目标\n"
        "将文章压缩为高信息密度的总结，帮助读者在 2 分钟内掌握核心内容。\n\n"
        "## 内容优先级（从高到低）\n"
        "1. **核心论点**：文章最想传达的主张或结论\n"
        "2. **关键事实/数据**：支撑论点的具体数字、研究、案例\n"
        "3. **技术细节**：代码、命令、配置片段——必须说明其作用，不可省略\n"
        "4. **背景与铺垫**：仅保留理解核心内容所必需的部分\n\n"
        "## 输出格式（严格遵守 Markdown）\n"
        "用数字编号分点，每点一句话，最后附一段「总评」：\n"
        "1. ...\n"
        "2. ...\n"
        "N. ...\n\n"
        "## 总评：[1-2 句话，说明文章的整体价值或局限性]\n\n"
        "## Markdown 规范\n"
        "- 所有输出必须使用 Markdown 语法\n"
        "- 标题使用 `##` 或 `###`\n"
        "- 重点内容使用 `**加粗**`\n"
        "- 代码/命令使用 `` `行内代码` `` 或代码块\n"
        "- 列表使用 Markdown 标准列表语法（数字或 `-`）\n\n"
        "## 约束\n"
        "- 禁止编造原文没有的信息\n"
        "- 总结长度控制在原文的 10-15%，不超过 500 字\n"
        "- 若原文含代码/命令，至少用 1 条要点说明其功能和用法"
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
        "- 使用 Markdown 格式输出，重点内容用 `**加粗**`\n"
        "- 代码/命令用 `` `行内代码` `` 或代码块\n"
        "- 若需要列举，使用数字编号或 Markdown 列表\n"
        "## 工具调用\n"
        "- 当需要搜索时，使用 `WebSearchTools` 工具获取最新信息\n"
        "- 若搜索结果不足，结合文章内容补充信息\n"
        "- 若问题超出文章范围，使用搜索工具补充最新信息，并明确说明"
    )
    _MAX_INPUT_CHARS = 128_000
    DB = RedisDb(db_url=get_settings().REDIS_URL)

    def __init__(self) -> None:
        self._model = None

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

    def set_model(self, model_name: str = "Ling-2.6-1T") -> None:
        if model_name not in self._MODEL_MAP:
            raise ValueError(f"Unsupported model: {model_name}")
        self._model = OpenAILike(
            id=self._MODEL_MAP[model_name],
            api_key=get_settings().API_KEY,
            base_url="https://api.tbox.cn/api/llm/v1",
            temperature=0.3,
            timeout=60,
        )
        self._agent.model = self._model
        self._chat_agent.model = self._model

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

    @staticmethod
    def _get_field(obj: dict | object, key: str, default: object = None) -> Any:
        """从 dict 或 attrs 对象统一取字段。"""
        return obj.get(key, default) if isinstance(obj, dict) else getattr(obj, key, default)

    @staticmethod
    def _get_first_of(obj: dict | object, *keys: str, default=None) -> Any:
        """从 dict 或 attrs 对象依次尝试多个 key，返回首个非 None 值。"""
        for key in keys:
            val = ArticleSummarizer._get_field(obj, key)
            if val is not None:
                return val
        return default

    def _find_session(self, session_id: str):
        """从 Redis 中查找指定 session_id 的 session 对象。"""
        all_sessions = ArticleSummarizer.DB.get_sessions(
            session_type=SessionType.AGENT
        )
        for session in all_sessions:
            if self._get_field(session, "session_id") == session_id:
                return session
        return None

    async def get_summary_session(
        self, user_id: str, title: str | None, content: str
    ) -> dict | None:
        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "summary")
        try:
            session = self._find_session(session_id)
            if not session:
                logger.debug(f"无缓存 session: {session_id}")
                return None
            runs = self._get_field(session, "runs", [])
            if not runs:
                return None
            response = self._get_first_of(runs[-1], "content", "response")
            if response:
                return {
                    "session_id": session_id,
                    "summary": response,
                    "created_at": self._get_field(session, "created_at"),
                    "updated_at": self._get_field(session, "updated_at"),
                }
        except Exception as e:
            logger.warning(f"获取总结缓存失败: {e}")
        return None

    async def get_chat_session(
        self, user_id: str, title: str | None, content: str
    ) -> dict | None:
        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "chat")
        try:
            session = self._find_session(session_id)
            if not session:
                logger.debug(f"无对话缓存: {session_id}")
                return None
            runs = self._get_field(session, "runs", [])
            if not runs:
                return None
            messages = []
            for run in runs:
                msg = self._get_first_of(run, "message", "input")
                resp = self._get_first_of(run, "content", "response")
                if msg:
                    messages.append({"role": "user", "content": msg})
                if resp:
                    messages.append({"role": "assistant", "content": resp})
            return {
                "session_id": session_id,
                "messages": messages,
                "created_at": self._get_field(session, "created_at"),
                "updated_at": self._get_field(session, "updated_at"),
            }
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
                if self._get_field(session, "user_id") != user_id:
                    continue
                runs = self._get_field(session, "runs", [])
                if not runs:
                    continue
                last_run = runs[-1]
                last_msg = self._get_field(last_run, "message")
                last_resp = self._get_first_of(last_run, "response", "content")
                user_sessions.append(
                    {
                        "session_id": self._get_field(session, "session_id"),
                        "user_id": user_id,
                        "last_message": last_msg[:100] if last_msg else None,
                        "last_response_preview": (
                            last_resp[:200] if last_resp else None
                        ),
                        "run_count": len(runs),
                        "created_at": self._get_field(session, "created_at"),
                        "updated_at": self._get_field(session, "updated_at"),
                    }
                )
            user_sessions.sort(
                key=lambda x: x.get("updated_at") or 0, reverse=True
            )
            return user_sessions
        except Exception as e:
            logger.error(f"获取用户 session 列表失败: {e}")
            return []

    async def run_summarization_astream(
        self,
        content: str,
        user_id: str,
        title: str | None = None,
        model_name: str | None = None,
    ) -> AsyncIterator[str]:
        if not get_settings().API_KEY:
            logger.error("AI 服务未配置 API_KEY")
            raise RuntimeError("AI 服务未配置 API_KEY")

        normalized = self._normalize_content(content)
        if not normalized:
            raise ValueError("文章内容不能为空")

        user_prompt = self._build_user_prompt(
            normalized_content=normalized,
            title=title,
        )

        if model_name:
            self.set_model(model_name)

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
        model_name: str | None = None,
    ) -> AsyncIterator[str]:
        if not get_settings().API_KEY:
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

        if model_name:
            self.set_model(model_name)

        async for event in self._chat_agent.arun(
            full_message,
            session_id=session_id,
            user_id=user_id,
            stream=True,
        ):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)


article_summarizer = ArticleSummarizer()
