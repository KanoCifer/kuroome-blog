from __future__ import annotations

import re
from collections.abc import AsyncIterator

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.configs.config import settings
from app.configs.logger import logger


class ArticleSummarizer:
    _SYSTEM_PROMPT = (
        "你是一个擅长提炼文章重点的中文助手。"
        "请输出简洁、准确、可读性强的总结，优先保留：主题、核心观点、关键事实/结论。"
        "输出为纯文本，不要使用 Markdown 标题，不要编造原文没有的信息。"
    )
    _MAX_INPUT_CHARS = 12000

    def __init__(self) -> None:
        self._model = ChatOpenAI(
            model="Ling-1T",
            api_key=SecretStr(settings.API_KEY),
            temperature=0.2,
            timeout=45,
            base_url="https://api.tbox.cn/api/llm/v1",
        )

    def _build_user_prompt(
        self, normalized_content: str, title: str | None = None
    ) -> str:
        user_prompt = (
            "请总结下面文章内容，控制在 3-6 条要点，最后补一行一句话总评。\n\n"
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

    async def summarize_article(
        self, content: str, title: str | None = None
    ) -> str:
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

        result = await self._model.ainvoke(
            [
                SystemMessage(content=self._SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )
        output = (result.content or "").strip()  # type: ignore
        if not output:
            logger.error("AI 未返回有效总结")
            raise RuntimeError("AI 未返回有效总结")
        return output

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

        async for chunk in self._model.astream(
            [
                SystemMessage(content=self._SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        ):
            output = str(chunk.content or "")
            if output:
                yield output


article_summarizer = ArticleSummarizer()
