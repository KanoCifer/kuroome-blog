"""NomuDesign API schemas."""

from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.translate import UsageMetrics


class PromptOptimizeRequest(BaseModel):
    """``POST /v2/nomu/prompt-optimize`` 请求体"""

    prompt: str = Field(min_length=1, description="用户输入的图生成提示词")


class PromptOptimizeResult(BaseModel):
    """LLM 结构化输出（``output_schema``）；API 响应见 ``PromptOptimizeResponse``。"""

    prompt: str = Field(..., description="优化后的提示词")
    usage: UsageMetrics | None = Field(
        None, description="本次调用的 token 消耗（可选，向后兼容）"
    )


class PromptOptimizeResponse(PromptOptimizeResult):
    """``POST /v2/nomu/prompt-optimize`` 响应体（``data`` 字段）"""

    credits_spent: float | None = Field(
        None, description="本次实扣积分（分；退款后不回填）"
    )


# ── Nomu 通用采集 AI 解析（右键菜单 → TaskIQ → 云端池）───────────────── #

UrlStr = Annotated[str, StringConstraints(max_length=2048)]
JsonLdStr = Annotated[str, StringConstraints(max_length=8_000)]
ScreenshotB64 = Annotated[str, StringConstraints(max_length=700_000)]


class ProductParseRequest(BaseModel):
    """``POST /v2/nomu/product-parse`` 请求体 —— 通用采集快照 + 视口截图。

    字段与扩展端 ``GenericPageSnapshot`` 对齐（camelCase wire）；
    体量上限在此硬拒（422），不再依赖调用方自觉。
    """

    source_url: str = Field(alias="sourceUrl", min_length=1, description="源页地址")
    title: str = Field(default="", max_length=2_000, description="页面标题")
    description: str = Field(default="", max_length=4_000, description="页面描述")
    price: str | None = Field(None, max_length=64, description="快照采集的原始价格串")
    currency: str | None = Field(None, max_length=8, description="快照采集的币种")
    json_ld_raw: list[JsonLdStr] = Field(
        default_factory=list, alias="jsonLdRaw", max_length=5, description="JSON-LD Product 片段"
    )
    primary_images: list[UrlStr] = Field(
        default_factory=list, alias="primaryImages", max_length=20, description="主图候选"
    )
    page_images: list[UrlStr] = Field(
        default_factory=list, alias="pageImages", max_length=40, description="全页图片候选"
    )
    body_text: str = Field(
        default="", alias="bodyText", max_length=24_000, description="正文兜底文本（扩展端已截 20k）"
    )
    screenshot: ScreenshotB64 | None = Field(
        None, description="视口截图 JPEG 裸 base64（无 data: 前缀）"
    )


class ProductDraft(BaseModel):
    """LLM 结构化输出（``output_schema``）；非 API 响应，TaskIQ 内部消费。"""

    title: str | None = Field(None, description="商品标题（源语言，去除促销/物流噪声）")
    description: str | None = Field(None, description="商品描述/卖点，纯文本")
    brand: str | None = Field(None, description="品牌名；素材与工具均无法确定则为 null")
    price: str | None = Field(
        None, description="价格数字字符串（不含货币符号/千分位）；无法确定则为 null"
    )
    currency: str | None = Field(None, description="ISO 4217 货币代码（USD/EUR/GBP…）")
    image_urls: list[str] = Field(
        default_factory=list,
        description="选中的商品图，必须逐字来自候选 URL 列表，主图在前，最多 9 张",
    )
    unknown_fields: list[str] = Field(
        default_factory=list, description="无法确定的字段名，便于调试观测"
    )
    usage: UsageMetrics | None = Field(
        None, description="本次调用的 token 消耗（service 填充，LLM 不产出）"
    )


class ProductParseResponse(BaseModel):
    """``POST /v2/nomu/product-parse`` 响应体（``data`` 字段）—— 异步受理回执。"""

    job_id: str = Field(..., description="TaskIQ 任务 id")
    credits_spent: float | None = Field(None, description="本次预扣积分（分；失败已自动全额退）")
