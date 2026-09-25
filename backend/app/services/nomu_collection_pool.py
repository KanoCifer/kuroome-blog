"""AI 解析结果 → Nomu 云端共享池写入。

直写 Go syncbus 的 Redis 池并广播，绕过 Go HTTP 层 —— key / 字段格式是
**跨服务契约**，事实源：``go-backend/internal/service/syncbus/collection_snapshot.go``。
改动本模块的 key 构造或消息字段前，先对齐该文件（其测试守护格式）。

池条目 ``snapshot`` 字段是扩展端 ``Product`` 行的 camelCase JSON：
领取路径为 ``dbClient.product.create({ input: snap.snapshot })``（CloudPoolSheet.tsx），
因此这里产出的 JSON 必须与扩展 ``db-model.ts`` 的 Product 形状逐字段对齐。
"""

import json
import re
import time
from uuid import uuid4

from app.schemas.nomu import DraftLocalized, ProductDraft, ProductParseRequest

# Noon 商品图集上限 —— 与扩展 snapshot-mapping 的 MAX_PRODUCT_IMAGES 对齐
MAX_PRODUCT_IMAGES = 9

# 与 Go syncbus 对齐的 key 构造（collection_snapshot.go: collectionKey/collectionChannel）
COLLECTION_SOURCE = "other"  # ProductSourcePlatform 词表里的通用站点来源
PARSE_DEVICE_ID = "ai-parse"
PARSE_DEVICE_NAME = "AI 解析"


def collection_key(user_id: int) -> str:
    return f"nomu:sync:collection:{user_id}"


def collection_channel(user_id: int) -> str:
    return f"nomu:sync:collection:ch:{user_id}"


def _numeric_price(raw: str | None) -> str | None:
    """从价格串提取数字（含小数），供 ``ProductSource.price.amount``。"""
    if not raw:
        return None
    match = re.search(r"\d+(?:\.\d+)?", raw.replace(",", ""))
    return match.group(0) if match else None


# localized 文本上限 —— 标题防失控长串，描述对齐扩展端 description 量级
_LOCALIZED_TITLE_MAX = 500
_LOCALIZED_DESC_MAX = 8_000
_LOCALIZED_BULLETS_MAX = 12
_LOCALIZED_BULLET_MAX = 300


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _sanitize_localized(localized: DraftLocalized | None) -> dict | None:
    """清洗 LLM 译文为扩展端 ``LocalizedContent`` 形状（缺字段省略，空语言丢弃）。"""
    if localized is None:
        return None
    out: dict = {}
    for lang, item in (("en", localized.en), ("ar", localized.ar)):
        if item is None:
            continue
        entry: dict = {}
        title = _clean_text(item.title)
        description = _clean_text(item.description)
        if title:
            entry["title"] = title[:_LOCALIZED_TITLE_MAX]
        if description:
            entry["description"] = description[:_LOCALIZED_DESC_MAX]
        bullets = []
        for value in item.bullets:
            value = _clean_text(value)
            if value and value not in bullets:
                bullets.append(value[:_LOCALIZED_BULLET_MAX])
            if len(bullets) >= _LOCALIZED_BULLETS_MAX:
                break
        if bullets:
            entry["bullets"] = bullets
        if entry:
            out[lang] = entry
    return out or None


def _dedupe_urls(urls: list[str], allowed: set[str], limit: int) -> list[str]:
    out: list[str] = []
    for url in urls:
        if url in allowed and url not in out:
            out.append(url)
        if len(out) >= limit:
            break
    return out


def _sanitize_attributes(attributes: dict[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in attributes.items():
        key = key.strip()
        value = value.strip()
        if key and value and key not in out:
            out[key] = value
    return out


def build_product_row(req: ProductParseRequest, draft: ProductDraft) -> dict:
    """把解析草稿组装成扩展 ``Product`` 行形状（camelCase，含 id/revision/时间戳）。"""
    now_ms = int(time.time() * 1000)

    # 图片白名单校验：候选集之外的 URL 一律丢弃（LLM 幻觉防线最后一道）
    candidates = {*req.primary_images, *req.page_images}
    selected_urls = _dedupe_urls(draft.image_urls, candidates, MAX_PRODUCT_IMAGES)
    selected_item_images = _dedupe_urls(draft.item_image_urls, candidates, MAX_PRODUCT_IMAGES)
    selected_detail_images = _dedupe_urls(draft.detail_image_urls, candidates, MAX_PRODUCT_IMAGES)
    urls = list(selected_urls)
    for url in (*selected_item_images, *selected_detail_images):
        if url not in urls:
            urls.append(url)
        if len(urls) >= MAX_PRODUCT_IMAGES:
            break

    images = [
        {
            "id": f"a{uuid4().hex[:12]}",
            "url": url,
            "sort": sort,
            "isPrimary": sort == 0,
            "source": "source",
        }
        for sort, url in enumerate(urls)
    ]

    price_raw = draft.price or req.price
    amount = _numeric_price(draft.price)
    currency = draft.currency or req.currency

    source: dict = {
        "platform": COLLECTION_SOURCE,
        "url": req.source_url,
        "capturedAt": now_ms,
    }
    if req.primary_images:
        source["itemImages"] = list(dict.fromkeys(req.primary_images))
    if req.page_images:
        source["detailImages"] = list(dict.fromkeys(req.page_images))
    if _clean_text(draft.source_brand):
        source["brand"] = draft.source_brand.strip()
    if draft.features:
        features = [value for value in (_clean_text(item) for item in draft.features) if value]
        if features:
            source["features"] = features
    attributes = _sanitize_attributes(draft.attributes)
    if attributes:
        source["attributes"] = attributes
    if _clean_text(draft.category):
        source["category"] = draft.category.strip()
    if draft.dimensions is not None:
        dimensions = {
            key: value
            for key, value in (
                ("length", draft.dimensions.length),
                ("width", draft.dimensions.width),
                ("height", draft.dimensions.height),
                ("weight", draft.dimensions.weight),
            )
            if _clean_text(value)
        }
        if dimensions:
            source["dimensions"] = dimensions
    if draft.availability is not None:
        source["availability"] = draft.availability
    if price_raw:
        source["priceRaw"] = price_raw
    if amount:
        source["price"] = {"amount": amount, "currency": currency or "USD"}

    row: dict = {
        "id": str(uuid4()),
        "revision": 0,
        "partnerSku": "",
        "title": draft.title or req.title or req.source_url,
        "images": images,
        "source": source,
        "status": "draft",
        "variantRole": "single",
        "createdAt": now_ms,
        "updatedAt": now_ms,
    }
    description = draft.description or req.description
    if description:
        row["description"] = description
    if _clean_text(draft.barcode):
        row["barcode"] = draft.barcode.strip()
    localized = _sanitize_localized(draft.localized)
    if localized:
        row["localized"] = localized
    return row


def build_pool_snapshot(product_row: dict) -> tuple[str, str, str]:
    """组装池条目：返回 ``(snap_id, snap_json, update_json)``。

    snap 字段与 Go ``CollectionSnapshot`` / 扩展 ``sync-model.CollectionSnapshot``
    对齐；update 与 ``CollectionSnapshotUpdate``（kind=put）对齐。
    """
    snap_id = f"ai-{uuid4()}"
    snap = {
        "id": snap_id,
        "source": COLLECTION_SOURCE,
        "captured_at": int(time.time()),
        "from": PARSE_DEVICE_ID,
        "name": PARSE_DEVICE_NAME,
        "snapshot": product_row,
    }
    update = {
        "kind": "put",
        "id": snap_id,
        "from": PARSE_DEVICE_ID,
        "at": int(time.time()),
    }
    return snap_id, json.dumps(snap, ensure_ascii=False), json.dumps(update, ensure_ascii=False)
