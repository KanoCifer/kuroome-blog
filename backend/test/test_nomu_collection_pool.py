"""nomu_collection_pool 载荷契约测试。

池条目 snapshot 必须与扩展 Product 行（db-model.ts）逐字段对齐 ——
领取路径 ``dbClient.product.create({ input: snap.snapshot })`` 直接消费；
key/字段与 go-backend syncbus/collection_snapshot.go 对齐。
"""

from app.schemas.nomu import ProductDraft, ProductParseRequest
from app.services.nomu_collection_pool import (
    build_pool_snapshot,
    build_product_row,
    collection_channel,
    collection_key,
)


def _request(**overrides) -> ProductParseRequest:
    base = {
        "sourceUrl": "https://example.com/item/1",
        "title": "Page Title",
        "description": "page desc",
        "primaryImages": ["https://cdn.example.com/a.jpg"],
        "pageImages": ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
        "bodyText": "body",
    }
    base.update(overrides)
    return ProductParseRequest.model_validate(base)


def test_product_row_matches_extension_shape():
    req = _request()
    draft = ProductDraft(
        title="Silk Scarf",
        description="100% mulberry silk",
        price="$ 29.99",
        currency="USD",
        image_urls=["https://cdn.example.com/b.jpg", "https://cdn.example.com/a.jpg"],
    )

    row = build_product_row(req, draft)

    assert set(row) == {
        "id",
        "revision",
        "partnerSku",
        "title",
        "description",
        "images",
        "source",
        "status",
        "variantRole",
        "createdAt",
        "updatedAt",
    }
    assert row["revision"] == 0 and row["partnerSku"] == "" and row["status"] == "draft"
    assert row["variantRole"] == "single"
    assert row["title"] == "Silk Scarf" and row["description"] == "100% mulberry silk"
    assert row["source"]["platform"] == "other"
    assert row["source"]["url"] == req.source_url
    # 价格数字提取：去掉符号，currency 透传
    assert row["source"]["priceRaw"] == "$ 29.99"
    assert row["source"]["price"] == {"amount": "29.99", "currency": "USD"}
    # 主图排序 + isPrimary
    assert [i["url"] for i in row["images"]] == [
        "https://cdn.example.com/b.jpg",
        "https://cdn.example.com/a.jpg",
    ]
    assert row["images"][0]["isPrimary"] is True
    assert all(i["source"] == "source" for i in row["images"])


def test_product_row_preserves_detailed_source_metadata():
    from app.schemas.nomu import (
        DraftDimensions,
        DraftLocalized,
        DraftLocalizedItem,
    )

    req = _request()
    draft = ProductDraft(
        title="Cotton Shirt",
        source_brand="Example Brand",
        features=["breathable", "machine washable"],
        attributes={"Material": "100% cotton", "": "ignored"},
        category="Men's Shirts",
        dimensions=DraftDimensions(length="30 cm", width="20 cm"),
        barcode="1234567890123",
        availability=True,
        item_image_urls=["https://cdn.example.com/a.jpg"],
        detail_image_urls=["https://cdn.example.com/b.jpg"],
        localized=DraftLocalized(
            en=DraftLocalizedItem(title="Cotton Shirt", bullets=["Breathable"]),
        ),
    )

    row = build_product_row(req, draft)

    assert row["barcode"] == "1234567890123"
    assert row["source"]["brand"] == "Example Brand"
    assert row["source"]["features"] == ["breathable", "machine washable"]
    assert row["source"]["attributes"] == {"Material": "100% cotton"}
    assert row["source"]["category"] == "Men's Shirts"
    assert row["source"]["dimensions"] == {"length": "30 cm", "width": "20 cm"}
    assert row["source"]["availability"] is True
    assert row["source"]["itemImages"] == ["https://cdn.example.com/a.jpg"]
    assert row["source"]["detailImages"] == [
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/b.jpg",
    ]
    assert row["localized"]["en"]["bullets"] == ["Breathable"]
    assert [image["url"] for image in row["images"]] == [
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/b.jpg",
    ]


def test_product_row_drops_hallucinated_urls():
    """候选集之外的 URL 一律丢弃 —— LLM 幻觉防线最后一道。"""
    req = _request()
    draft = ProductDraft(
        title="T",
        image_urls=["https://cdn.example.com/a.jpg", "https://evil.com/fake.jpg"],
    )

    row = build_product_row(req, draft)

    assert [i["url"] for i in row["images"]] == ["https://cdn.example.com/a.jpg"]


def test_product_row_localized_passthrough():
    """LLM 译文清洗后写入 localized（LocalizedContent 形状，缺字段省略）。"""
    from app.schemas.nomu import DraftLocalized, DraftLocalizedItem

    req = _request()
    draft = ProductDraft(
        title="真丝丝巾",
        localized=DraftLocalized(
            en=DraftLocalizedItem(title="Silk Scarf", description="100% mulberry silk"),
            ar=DraftLocalizedItem(title="وشاح حريري"),
        ),
    )

    row = build_product_row(req, draft)

    assert row["localized"] == {
        "en": {"title": "Silk Scarf", "description": "100% mulberry silk"},
        "ar": {"title": "وشاح حريري"},
    }


def test_product_row_omits_empty_localized():
    """空译文与整段缺省都不产出 localized 键，行形状保持干净。"""
    from app.schemas.nomu import DraftLocalized, DraftLocalizedItem

    req = _request()
    blank = build_product_row(req, ProductDraft(localized=DraftLocalized()))
    assert "localized" not in blank
    absent = build_product_row(req, ProductDraft())
    assert "localized" not in absent
    whitespace = build_product_row(
        req,
        ProductDraft(localized=DraftLocalized(en=DraftLocalizedItem(title="   "))),
    )
    assert "localized" not in whitespace


def test_product_row_falls_back_to_snapshot_fields():
    """草稿字段缺失时回落快照值；title 永不兜成空串。"""
    req = _request(price="129,00 EUR", currency="EUR")
    draft = ProductDraft()

    row = build_product_row(req, draft)

    assert row["title"] == "Page Title"
    assert row["description"] == "page desc"
    assert row["source"]["priceRaw"] == "129,00 EUR"
    assert "price" not in row["source"]  # LLM 未给数字价，不硬造 Money
    assert row["images"] == []


def test_pool_snapshot_and_update_align_with_syncbus():
    req = _request()
    row = build_product_row(req, ProductDraft(title="T"))

    snap_id, snap_json, update_json = build_pool_snapshot(row)

    import json

    snap = json.loads(snap_json)
    update = json.loads(update_json)
    assert snap_id.startswith("ai-")
    assert snap["id"] == snap_id and snap["snapshot"] == row
    assert snap["source"] == "other" and snap["from"] == "ai-parse" and snap["name"] == "AI 解析"
    assert update == {"kind": "put", "id": snap_id, "from": "ai-parse", "at": snap["captured_at"]}


def test_redis_keys_match_go_contract():
    assert collection_key(42) == "nomu:sync:collection:42"
    assert collection_channel(42) == "nomu:sync:collection:ch:42"
