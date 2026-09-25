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


class DraftLocalizedItem(BaseModel):
    """单语言本地化草稿。"""

    title: str | None = Field(None, description="该语言的商品标题")
    description: str | None = Field(None, description="该语言的商品描述")
    bullets: list[str] = Field(
        default_factory=list, max_length=12, description="该语言的商品卖点"
    )


class DraftDimensions(BaseModel):
    """来源商品尺寸重量；无法确认的字段不输出。"""

    length: str | None = Field(None, max_length=100)
    width: str | None = Field(None, max_length=100)
    height: str | None = Field(None, max_length=100)
    weight: str | None = Field(None, max_length=100)


class DraftLocalized(BaseModel):
    """英文/阿拉伯语翻译，供扩展端 ``LocalizedContent``（localized.en/ar）。"""

    en: DraftLocalizedItem | None = Field(
        None, description="英文标题/描述/卖点"
    )
    ar: DraftLocalizedItem | None = Field(
        None, description="阿拉伯语标题/描述/卖点"
    )


class ProductDraft(BaseModel):
    """LLM 结构化输出（``output_schema``）；非 API 响应，TaskIQ 内部消费。"""

    title: str | None = Field(None, description="商品标题（源语言，去除促销/物流噪声）")
    description: str | None = Field(None, description="商品描述/卖点，纯文本")
    # 不输出 Product.brand：它是 Noon brand code，来源品牌名称只能进入 source.brand。
    source_brand: str | None = Field(
        None,
        max_length=300,
        description="来源商品品牌名称；不是 Noon brand code",
    )
    features: list[str] = Field(
        default_factory=list, max_length=20, description="来源商品卖点列表"
    )
    attributes: dict[str, str] = Field(
        default_factory=dict, max_length=50, description="来源商品属性键值对"
    )
    category: str | None = Field(
        None, max_length=300, description="来源商品类目名称"
    )
    dimensions: DraftDimensions | None = Field(
        None, description="来源商品尺寸重量"
    )
    barcode: str | None = Field(
        None, max_length=128, description="来源商品条码，留空"
    )
    availability: bool | None = Field(None, description="来源商品是否可售")
    item_image_urls: list[str] = Field(
        default_factory=list,
        max_length=9,
        description="选中的商品主图，必须逐字来自候选 URL 列表",
    )
    detail_image_urls: list[str] = Field(
        default_factory=list,
        max_length=9,
        description="选中的详情图，必须逐字来自候选 URL 列表",
    )
    localized: DraftLocalized | None = Field(
        None,
        description="en/ar 语言的标题、描述与卖点翻译；无法可靠翻译时置 null",
    )
    price: str | None = Field(
        None, description="价格数字字符串（不含货币符号/千分位）；无法确定则为 null"
    )
    currency: str | None = Field(
        None, max_length=8, description="ISO 4217 货币代码（USD/EUR/GBP…）"
    )
    image_urls: list[str] = Field(
        default_factory=list,
        max_length=9,
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
