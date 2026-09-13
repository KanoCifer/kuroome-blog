"""product_parse_service 输出收敛测试。

agno 在"工具 loop + json_object 模式"下不做 str→Pydantic 水合，
`_coerce_draft` 必须接住三种回填形状，非法输出抛错走退款。
"""

import pytest
from pydantic import ValidationError

from app.schemas.nomu import ProductDraft
from app.services.product_parse_service import _coerce_draft


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
