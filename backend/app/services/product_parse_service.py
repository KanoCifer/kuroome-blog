"""Nomu 通用采集商品解析服务 —— 单 loop agentic 模式。

一个 DeepSeek agent（OpenAI 兼容端点，``use_json_mode`` 结构化输出）在一次
``arun`` 里自主完成：读素材 →（缺失信息时）调工具补全 → 产出
:class:`ProductDraft`。工具循环上限由 ``tool_call_limit`` 约束。

token 消耗从 ``response.metrics`` 解析并随草稿返回；``llm_usage`` 落库
由调用方（TaskIQ 任务）经 ``record_llm_usage`` 统一完成。
"""

import base64
import json
import re
from typing import Any

import httpx
from agno.media import Image
from agno.models.openai import OpenAIChat
from agno.tools.exa import ExaTools
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.llm_factory import create_agent
from app.core.llm_prompts import PRODUCT_PARSE_INSTRUCTIONS
from app.core.logger import logger
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


class DraftValidationError(ValueError):
    """解析结果未达到进入商品池的最低质量。"""


def _iter_json_ld(value: Any):
    if isinstance(value, dict):
        yield value
        graph = value.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                yield from _iter_json_ld(item)
    elif isinstance(value, list):
        for item in value:
            yield from _iter_json_ld(item)


def _json_ld_type_is_product(value: Any) -> bool:
    types = value if isinstance(value, list) else [value]
    return any(
        isinstance(item, str) and (item == "Product" or item.endswith("/Product"))
        for item in types
    )


def _json_ld_text(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, dict):
        for key in ("@value", "value"):
            item = value.get(key)
            if isinstance(item, str) and item.strip():
                return item.strip()
    return None


def _json_ld_images(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        return [url for item in value for url in _json_ld_images(item)]
    if isinstance(value, dict):
        url = value.get("url")
        return _json_ld_images(url)
    return []


def extract_deterministic_facts(req: ProductParseRequest) -> dict[str, Any]:
    """从当前页面 JSON-LD 提取 Agent 不应重新猜测的事实。"""
    facts: dict[str, Any] = {"title": None, "description": None, "price": None, "currency": None, "images": []}
    for raw in req.json_ld_raw[:5]:
        try:
            parsed = json.loads(raw[:MAX_JSONLD_CHARS])
        except (TypeError, ValueError):
            continue
        for node in _iter_json_ld(parsed):
            if not _json_ld_type_is_product(node.get("@type")):
                continue
            title = _json_ld_text(node.get("name"))
            description = _json_ld_text(node.get("description"))
            offers = node.get("offers")
            offer_list = offers if isinstance(offers, list) else [offers]
            for offer in offer_list:
                if not isinstance(offer, dict):
                    continue
                price = offer.get("price") or offer.get("lowPrice")
                if facts["price"] is None and isinstance(price, (str, int, float)):
                    facts["price"] = str(price)
                if facts["currency"] is None and isinstance(offer.get("priceCurrency"), str):
                    facts["currency"] = offer["priceCurrency"]
            images = _json_ld_images(node.get("image"))
            if not facts["images"]:
                facts["images"] = images
            if facts["title"] is None and title:
                facts["title"] = title
            if facts["description"] is None and description:
                facts["description"] = description
            if all(facts[key] is not None for key in ("title", "description", "price", "currency")) and facts["images"]:
                break
    return facts


def _candidate_urls(req: ProductParseRequest) -> set[str]:
    return {*req.primary_images, *req.page_images}


def _clean_price(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.replace(",", "").strip()
    return normalized if re.fullmatch(r"\d+(?:\.\d+)?", normalized) else None


def _clean_currency(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().upper()
    return normalized if re.fullmatch(r"[A-Z]{3}", normalized) else None


def normalize_draft(draft: ProductDraft, req: ProductParseRequest, facts: dict[str, Any]) -> ProductDraft:
    """合并确定性兜底并执行 LLM 输出的第一道边界清洗。"""
    candidates = _candidate_urls(req)
    unknown = list(dict.fromkeys(draft.unknown_fields))
    item_images = [url for url in draft.item_image_urls if url in candidates]
    detail_images = [url for url in draft.detail_image_urls if url in candidates]
    images = [url for url in draft.image_urls if url in candidates]
    if not images:
        images = list(dict.fromkeys([*item_images, *detail_images]))
    if not images:
        images = [url for url in facts["images"] if url in candidates]
    if not images:
        images = req.primary_images[:9]

    price = _clean_price(draft.price)
    if price is None:
        price = _clean_price(str(facts["price"])) if facts["price"] is not None else None
    if price is None and req.price:
        price = _clean_price(req.price)
    if price is None and draft.price and "price" not in unknown:
        unknown.append("price")
    if price is None and req.price and "price" not in unknown:
        unknown.append("price")

    currency = _clean_currency(draft.currency)
    if currency is None and facts["currency"]:
        currency = _clean_currency(str(facts["currency"]))
    currency = currency or _clean_currency(req.currency)
    title = (draft.title or facts["title"] or req.title or "").strip()
    description = draft.description or facts["description"] or req.description
    return draft.model_copy(
        update={
            "title": title or None,
            "description": description,
            "price": price,
            "currency": currency,
            "image_urls": images[:9],
            "item_image_urls": item_images[:9],
            "detail_image_urls": detail_images[:9],
            "unknown_fields": unknown,
        }
    )


def validate_draft(draft: ProductDraft) -> None:
    if not draft.title or len(draft.title.strip()) < 2:
        raise DraftValidationError("商品标题为空或过短")
    if not draft.image_urls:
        raise DraftValidationError("没有通过候选白名单的商品图片")
    if draft.price is not None and _clean_price(draft.price) is None:
        raise DraftValidationError("商品价格不是数字字符串")


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
        parts.extend(raw[:MAX_JSONLD_CHARS] for raw in req.json_ld_raw[:5])
    facts = extract_deterministic_facts(req)
    if any(facts.values()):
        parts.append(
            "确定性抽取结果（优先于正文，AI 只补缺失或整理）：\n"
            f"标题: {facts['title'] or ''}\n"
            f"描述: {facts['description'] or ''}\n"
            f"价格: {facts['price'] or ''} {facts['currency'] or ''}\n"
            f"图片: {', '.join(facts['images'])}"
        )
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
        """确定性合并 + 单次 Agent 补全，失败最多修复重试一次。"""
        if self.model is None:
            raise RuntimeError("AI 服务未配置 DEEPSEEK_API_KEY（商品解析依赖）")

        agent = create_agent(
            model=self.model,
            instructions=PRODUCT_PARSE_INSTRUCTIONS,
            db=None,
            tools=build_research_tools(),
            tool_call_limit=TOOL_CALL_LIMIT,
            use_json_mode=True,
            output_schema=ProductDraft,
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

        facts = extract_deterministic_facts(req)
        message = build_user_message(req)
        last_error: DraftValidationError | None = None
        for attempt in range(2):
            response = await agent.arun(message, images=images)
            draft = normalize_draft(_coerce_draft(response.content), req, facts)
            try:
                validate_draft(draft)
            except DraftValidationError as exc:
                last_error = exc
                if attempt == 1:
                    raise
                message = (
                    f"{build_user_message(req)}\n\n"
                    "上一次输出未通过质量门禁，请修正后重新输出 JSON："
                    f"{exc}。必须提供标题和至少一张候选图片；不要编造候选集之外的 URL。"
                )
                continue

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

        raise last_error or RuntimeError("商品解析未产生有效结果")


def _coerce_draft(content: Any) -> ProductDraft:
    """把 agent 输出收敛成 :class:`ProductDraft`。

    agno 视模型/路径不同可能回填 Pydantic 实例、dict 或 JSON 字符串
    （json_object 模式 + 工具 loop 时是后者；其内置 str 转换失败只打
    warning 不抛错），这里统一收敛，产出非法 JSON 时抛错走退款。
    """
    try:
        if isinstance(content, ProductDraft):
            return content
        if isinstance(content, dict):
            return ProductDraft.model_validate(content)
        if isinstance(content, str):
            text = content.strip()
            # 兜底剥掉可能的 markdown 围栏（json_object 模式下通常不会有）
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)
            return ProductDraft.model_validate_json(text)
    except (ValidationError, ValueError) as exc:
        logger.bind(component="nomu_parse").warning(
            "product parse output coerce failed",
            content_type=type(content).__name__,
            content_preview=str(content)[:500],
            error=repr(exc),
        )
        raise
    raise RuntimeError(f"商品解析输出类型异常: {type(content)!r}")
