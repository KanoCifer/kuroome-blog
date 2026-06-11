from __future__ import annotations

import hashlib
import re
from collections.abc import AsyncIterator
from typing import Any, ClassVar

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

    _MODEL_MAP: ClassVar[dict[str, str]] = {
        "Ring 2.6": "Ring-2.6-1T",
        "Ling 2.6": "Ling-2.6-1T",
    }

    _SYSTEM_PROMPT = (
        "你是一名专业的中文内容分析师。你的任务是提炼文章的核心信息，"
        "让读者用最少时间获得最大价值。\n\n"
        "## 分析步骤\n"
        "1. 先识别文章类型（技术教程 / 观点论述 / 新闻报道 / 工具介绍 / 经验分享）\n"
        "2. 根据类型确定总结侧重：\n"
        "   - 技术教程：重点保留操作步骤、关键配置、踩坑点\n"
        "   - 观点论述：重点保留核心论点、论据、结论\n"
        "   - 新闻报道：重点保留事件、数据、影响\n"
        "   - 工具介绍：重点保留解决什么问题、核心特性、适用场景\n"
        "   - 经验分享：重点保留结论、方法论、可复用的经验\n"
        "3. 按优先级提炼要点：核心结论 > 关键数据/案例 > 技术细节 > 背景铺垫\n"
        "4. 输出总结\n\n"
        "## 输出格式\n"
        "- 用数字编号分点，每点一句话概括一个要点\n"
        "- 代码/命令/配置必须说明其作用，不可省略\n"
        "- 最后附一段「总评」：1-2 句话说明文章的整体价值或局限性\n"
        "- 长度控制在原文的 10-15%\n\n"
        "## 约束\n"
        "- 禁止编造原文没有的信息\n"
        "- 只输出总结本身，不要输出分析过程"
    )
    _CHAT_SYSTEM_PROMPT = (
        "你是一名中文知识助手，和用户一起深入探讨他刚读过的文章。\n\n"
        "## 回答原则\n"
        "- 优先从文章内容中找依据，引用原文关键句\n"
        "- 技术问题可以展开原理，结合文章上下文举例\n"
        "- 不确定的内容主动说明局限性\n\n"
        "## 搜索工具\n"
        "- 问题超出文章范围时，用 WebSearchTools 搜索补充，注明「以下来自搜索结果」\n"
        "- 搜索结果不足时，结合已有文章内容补全\n\n"
        "## 对话节奏\n"
        "- 简洁直接，不重复用户问题\n"
        "- 回答后可以在适当时机追问「你想深入了解哪个方面？」引导进一步讨论"
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
