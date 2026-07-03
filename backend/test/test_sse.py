"""Unit tests for app.utils.sse — SSE event formatting."""

from __future__ import annotations

import json

from app.utils.sse import sse_event


def test_sse_event_starts_with_data_prefix():
    event = sse_event({"status": "ok"})
    assert event.startswith("data:")


def test_sse_event_ends_with_double_newline():
    event = sse_event({"status": "ok"})
    assert event.endswith("\n\n")


def test_sse_event_contains_valid_json():
    payload = {"progress": 42, "message": "处理中"}
    event = sse_event(payload)
    json_str = event.removeprefix("data:").removesuffix("\n\n")
    assert json.loads(json_str) == payload


def test_sse_event_with_empty_dict():
    event = sse_event({})
    assert event == "data:{}\n\n"


def test_sse_event_with_nested_data():
    payload = {
        "items": [{"id": 1, "name": "测试"}],
        "total": 1,
    }
    event = sse_event(payload)
    json_str = event[5:-2]  # strip "data:" prefix and "\n\n" suffix
    assert json.loads(json_str) == payload
