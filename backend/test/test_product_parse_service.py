"""product_parse_service 输出收敛测试。

agno 在"工具 loop + json_object 模式"下不做 str→Pydantic 水合，
`_coerce_draft` 必须接住三种回填形状，非法输出抛错走退款。
"""

import pytest
from pydantic import ValidationError

from app.schemas.nomu import ProductDraft, ProductParseRequest
from app.services.product_parse_service import (
    DraftValidationError,
    _coerce_draft,
    build_user_message,
    extract_deterministic_facts,
    normalize_draft,
    validate_draft,
)


def test_accepts_model_instance():
    draft = ProductDraft(title="T")
    assert _coerce_draft(draft) is draft


def test_accepts_dict():
    draft = _coerce_draft({"title": "T", "price": "9.9", "currency": "USD"})
    assert isinstance(draft, ProductDraft)
    assert draft.price == "9.9"


def test_accepts_json_str():
    draft = _coerce_draft('{"title": "T", "image_urls": []}')
    assert draft.title == "T"


def test_strips_markdown_fence():
    draft = _coerce_draft('```json\n{"title": "T"}\n```')
    assert draft.title == "T"


def test_rejects_invalid_json_and_shape():
    with pytest.raises(ValidationError):
        _coerce_draft("不是 JSON")
    with pytest.raises(RuntimeError):
        _coerce_draft(12345)


def test_unknown_fields_yield_empty_draft():
    """全字段可选 + 忽略未知键 —— 空形状合法，回落逻辑交给 build_product_row。"""
    draft = _coerce_draft('{"unknown_field": 1}')
    assert draft.title is None and draft.image_urls == []


def test_extracts_full_url_json_ld_facts_before_ai():
    req = ProductParseRequest.model_validate(
        {
            "sourceUrl": "https://example.com/item/1",
            "jsonLdRaw": [
                '{"@type":"https://schema.org/Product","name":"Silk Scarf",'
                '"description":"Soft silk","offers":{"price":"29.99","priceCurrency":"USD"},'
                '"image":["https://cdn.example.com/scarf.jpg"]}'
            ],
            "primaryImages": ["https://cdn.example.com/scarf.jpg"],
        }
    )
    facts = extract_deterministic_facts(req)
    assert facts == {
        "title": "Silk Scarf",
        "description": "Soft silk",
        "price": "29.99",
        "currency": "USD",
        "images": ["https://cdn.example.com/scarf.jpg"],
    }
    assert "确定性抽取结果" in build_user_message(req)


def test_normalize_filters_hallucinated_images_and_repairs_price():
    req = ProductParseRequest.model_validate(
        {
            "sourceUrl": "https://example.com/item/1",
            "primaryImages": ["https://cdn.example.com/main.jpg"],
            "pageImages": [],
        }
    )
    facts = {"title": None, "description": None, "price": "19.00", "currency": "EUR", "images": []}
    draft = normalize_draft(
        ProductDraft(title="Bag", price="$19.00", currency="eur", image_urls=["https://evil.example/x.jpg"]),
        req,
        facts,
    )
    assert draft.image_urls == ["https://cdn.example.com/main.jpg"]
    assert draft.price == "19.00"
    assert draft.currency == "EUR"
    validate_draft(draft)


def test_validate_rejects_empty_or_image_missing_draft():
    with pytest.raises(DraftValidationError):
        validate_draft(ProductDraft(title="T"))
    with pytest.raises(DraftValidationError):
        validate_draft(ProductDraft(image_urls=["https://cdn.example.com/main.jpg"]))
