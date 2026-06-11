from __future__ import annotations

import hashlib
import re
from collections.abc import AsyncIterator
from typing import Any

from agno.agent import RunOutputEvent
from agno.db.base import SessionType
from agno.db.redis import RedisDb

from app.core.config import get_settings
from app.core.llm_factory import (
    create_agent,
    create_llm_model,
    create_redis_db,
)
from app.core.logger import logger


class ArticleSummarizer:
    """文章总结 + 对话 Agent。

    公开接口仅 3 个方法：summarize / chat / get_history。
    内部通过 _find_session / _get_cached_* 处理 session 缓存逻辑。
    """

    _MODEL_MAP: dict[str, str] = {
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

    def __init__(self, db: RedisDb | None = None) -> None:
        self._db = db or create_redis_db()

    # ── 公开接口（3 个方法）────────────────────────────────

    async def summarize(
        self,
        content: str,
        user_id: str,
        title: str | None = None,
        model_name: str | None = None,
    ) -> AsyncIterator[str]:
        """流式生成文章总结。"""
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

        model = self._resolve_model(model_name)
        agent = create_agent(
            model=model,
            instructions=self._SYSTEM_PROMPT,
            db=self._db,
        )

        article_hash = self._hash_article(title, content)
        session_id = self._article_session_id(user_id, article_hash, "summary")

        async for event in agent.arun(
            user_prompt, stream=True, user_id=user_id, session_id=session_id
        ):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)

    async def chat(
        self,
        message: str,
        user_id: str,
        session_id: str,
        article_content: str | None = None,
        article_title: str | None = None,
        model_name: str | None = None,
    ) -> AsyncIterator[str]:
        """流式对话。"""
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

        model = self._resolve_model(model_name)
        chat_agent = create_agent(
            model=model,
            instructions=self._CHAT_SYSTEM_PROMPT,
            db=self._db,
        )

        async for event in chat_agent.arun(
            full_message,
            session_id=session_id,
            user_id=user_id,
            stream=True,
        ):
            if isinstance(event, RunOutputEvent) and event.content:
                yield str(event.content)

    async def get_history(self, user_id: str) -> list[dict]:
        """获取用户的所有 session 历史摘要。"""
        try:
            all_sessions = self._db.get_sessions(
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

    def get_cached_summary(
        self, user_id: str, title: str | None, content: str
    ) -> dict | None:
        """获取缓存的总结 session。"""
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

    def get_cached_chat(
        self, user_id: str, title: str | None, content: str
    ) -> dict | None:
        """获取缓存的对话 session。"""
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

    def get_agent_sessions(self):
        """获取所有 agent session（从 AiRepo 吸收，用于 debug 端点）。"""
        result = self._db.get_sessions(session_type=SessionType.AGENT)
        if isinstance(result, tuple):
            return result[0]
        return result

    # ── 内部方法 ────────────────────────────────────────────

    def _resolve_model(self, model_name: str | None = None):
        """根据友好名解析并创建 model 实例。"""
        if model_name and model_name not in self._MODEL_MAP:
            raise ValueError(f"Unsupported model: {model_name}")
        model_id = self._MODEL_MAP[model_name] if model_name else "Ling-2.6-1T"
        return create_llm_model(model_id)

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

    def _find_session(self, session_id: str):
        """从 Redis 中查找指定 session_id 的 session 对象。"""
        all_sessions = self._db.get_sessions(session_type=SessionType.AGENT)
        for session in all_sessions:
            if self._get_field(session, "session_id") == session_id:
                return session
        return None

    @staticmethod
    def _get_field(
        obj: dict | object, key: str, default: object = None
    ) -> Any:
        """从 dict 或 attrs 对象统一取字段。"""
        return (
            obj.get(key, default)
            if isinstance(obj, dict)
            else getattr(obj, key, default)
        )

    @staticmethod
    def _get_first_of(obj: dict | object, *keys: str, default=None) -> Any:
        """从 dict 或 attrs 对象依次尝试多个 key，返回首个非 None 值。"""
        for key in keys:
            val = ArticleSummarizer._get_field(obj, key)
            if val is not None:
                return val
        return default
