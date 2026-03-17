from __future__ import annotations

import re
from collections.abc import AsyncIterator

from langchain.agents import create_agent
from langchain_core.messages import AIMessageChunk, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, SecretStr

from app.configs.config import settings
from app.configs.logger import logger


class SummaryInput(BaseModel):
    content: str = Field(description="需要总结的文章正文")
    title: str | None = Field(default=None, description="文章标题")


class ArticleSummarizer:
    _SYSTEM_PROMPT = (
        "你是一个擅长提炼文章重点的中文助手。"
        "请输出简洁、准确、可读性强的总结，优先保留：主题、核心观点、关键事实/结论。"
        "如果原文包含代码、配置片段、命令或技术实现细节，必须在总结中单独提及其作用与关键点。"
        "输出为纯文本，不要使用 Markdown 标题，不要编造原文没有的信息。"
    )
    _MAX_INPUT_CHARS = 128_000

    def __init__(self) -> None:
        self._model = ChatOpenAI(
            model="Ling-2.5-1T",
            api_key=SecretStr(settings.API_KEY),
            temperature=1,
            timeout=60,
            base_url="https://api.tbox.cn/api/llm/v1",
        )

        self._agent = create_agent(
            model=self._model,
            system_prompt=self._SYSTEM_PROMPT,
            tools=[],
            # 目前不使用工具，直接让模型输出总结结果
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
            ],
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
        messages = [
            SystemMessage(content=self._SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]

        async for chunk in self._model.astream(messages):
            output = str(chunk.content or "")
            if output:
                yield output

    async def run_summarization_astream(
        self, content: str, title: str | None = None
    ) -> AsyncIterator[str]:
        # 使用 astream 替代 invoke
        async for event in self._agent.astream(
            {
                "messages": [
                    SystemMessage(content=self._SYSTEM_PROMPT),
                    HumanMessage(
                        content=self._build_user_prompt(
                            normalized_content=self._normalize_content(
                                content
                            ),
                            title=title,
                        )
                    ),
                ]
            },
            stream_mode="messages",
        ):
            # event 是一个元组，包含 [message, metadata]
            message, _ = event

            # 只输出 AI 的内容块
            if isinstance(message, AIMessageChunk) and message.content:
                # 类型可能并非 str，强制转换并返回
                yield str(message.content)


article_summarizer = ArticleSummarizer()
