"""Nomu 通用采集商品解析服务 —— 单 loop agentic 模式。

一个 DeepSeek agent（OpenAI 兼容端点，``use_json_mode`` 结构化输出）在一次
``arun`` 里自主完成：读素材 →（缺失信息时）调工具补全 → 产出
:class:`ProductDraft`。工具循环上限由 ``tool_call_limit`` 约束。

token 消耗从 ``response.metrics`` 解析并随草稿返回；``llm_usage`` 落库
由调用方（TaskIQ 任务）经 ``record_llm_usage`` 统一完成。
"""

import base64
import re

import httpx
from agno.media import Image
from agno.models.openai import OpenAIChat
from agno.tools.exa import ExaTools

from app.core.config import get_settings
from app.core.llm_factory import create_agent
from app.core.llm_prompts import PRODUCT_PARSE_INSTRUCTIONS
from app.schemas.nomu import ProductDraft, ProductParseRequest
from app.schemas.translate import UsageMetrics

# 正文/图片候选的兜底截断（schema 已设上限，这里防上游来源变化）
MAX_PAGE_IMAGES = 40
MAX_JSONLD_CHARS = 8_000

# fetch_url 工具体量约束：超时 / 响应文本截断
FETCH_TIMEOUT_S = 10.0
FETCH_TEXT_LIMIT = 20_000

# agentic loop 工具调用轮次上限
TOOL_CALL_LIMIT = 8


async def fetch_url(url: str) -> str:
    """抓取网页并抽取纯文本，供 agent 在素材缺失时自主补全。

    只面向 LLM 消费：去 script/style、折叠空白、截断，不做任何结构化解析。
    """
    try:
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=FETCH_TIMEOUT_S
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            html = response.text
    except httpx.HTTPError as exc:
        return f"抓取失败: {exc!r}"

    # 剥离 script/style 后折叠空白 —— 轻量提取，够 LLM 读即可
    for tag in ("script", "style"):
        html = re.sub(
            rf"<{tag}[^>]*>.*?</{tag}>", " ", html, flags=re.DOTALL | re.IGNORECASE
        )
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:FETCH_TEXT_LIMIT] or "(页面无可读文本)"


def build_research_tools() -> list:
    """组装解析工具：fetch_url 常驻；EXA_API_KEY 配置时追加 Exa（仅 search + contents）。"""
    tools: list = [fetch_url]
    exa_api_key = get_settings().EXA_API_KEY
    if exa_api_key:
        tools.append(
            ExaTools(
                api_key=exa_api_key,
                enable_search=True,
                enable_get_contents=True,
                enable_find_similar=False,
                enable_answer=False,
                show_results=True,
                text_length_limit=2_000,
            )
        )
    return tools


def _candidate_image_table(req: ProductParseRequest) -> str:
    """把主图候选 + 全页图片渲染成编号清单 —— image_urls 只允许从这里逐字选取。"""
    seen: set[str] = set()
    lines: list[str] = []
    for i, url in enumerate([*req.primary_images, *req.page_images], start=1):
        if url in seen:
            continue
        seen.add(url)
        lines.append(f"{i}. {url}")
        if len(lines) >= MAX_PAGE_IMAGES:
            break
    return "\n".join(lines)


def build_user_message(req: ProductParseRequest) -> str:
    """把采集快照渲染成 agent 的 user message。"""
    parts: list[str] = [f"源页地址: {req.source_url}"]
    if req.title:
        parts.append(f"页面标题: {req.title}")
    if req.description:
        parts.append(f"页面描述: {req.description}")
    if req.price or req.currency:
        parts.append(f"快照价格: {req.price or '未知'} {req.currency or ''}".strip())
    if req.json_ld_raw:
        parts.append("JSON-LD Product 片段:")
        parts.extend(req.json_ld_raw[:5])
    parts.append("候选图片列表（image_urls 只能逐字从这里选）:")
    parts.append(_candidate_image_table(req))
    if req.body_text:
        parts.append(f"正文文本:\n{req.body_text}")
    return "\n\n".join(parts)


class ProductParseService:
    """通用采集商品解析（无状态单次 run）。

    usage 落库由调用方（TaskIQ 任务）负责，本服务只在草稿上携带 token 消耗。
    """

    def __init__(self, model: OpenAIChat | None = None):
        # DEEPSEEK_API_KEY 未配置时 model 为 None；路由经 is_configured 前置
        # 守卫，parse 内再抛一次兜底（TaskIQ 直调路径）。
        self.model = model

    def is_configured(self) -> bool:
        """DEEPSEEK_API_KEY 是否可用（路由 4xx 前置守卫用）。"""
        return self.model is not None

    async def parse(self, req: ProductParseRequest) -> ProductDraft:
        """单 loop 解析：工具补全 + 结构化输出一次 ``arun`` 完成。"""
        if self.model is None:
            raise RuntimeError("AI 服务未配置 DEEPSEEK_API_KEY（商品解析依赖）")

        agent = create_agent(
            model=self.model,
            instructions=PRODUCT_PARSE_INSTRUCTIONS,
            db=None,
            tools=build_research_tools(),
            tool_call_limit=TOOL_CALL_LIMIT,
            use_json_mode=True,
        )

        images: list[Image] | None = None
        if req.screenshot:
            images = [
                Image(
                    content=base64.b64decode(req.screenshot),
                    mime_type="image/jpeg",
                    format="jpeg",
                )
            ]

        response = await agent.arun(
            build_user_message(req),
            images=images,
            output_schema=ProductDraft,
        )
        draft: ProductDraft = response.content  # pyright: ignore[reportAssignmentType]

        metrics = getattr(response, "metrics", None)
        if metrics is not None:
            input_tokens = getattr(metrics, "input_tokens", 0) or 0
            output_tokens = getattr(metrics, "output_tokens", 0) or 0
            total_tokens = getattr(metrics, "total_tokens", 0) or 0
            duration = getattr(metrics, "duration", None)
            duration_ms = round(duration * 1000) if duration is not None else None
            draft = draft.model_copy(
                update={
                    "usage": UsageMetrics(
                        model=self.model.id,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        total_tokens=total_tokens,
                        duration_ms=duration_ms,
                    )
                }
            )

        return draft
