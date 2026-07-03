"""Unit tests for app.core.response — APIResponse envelope + helper."""

from __future__ import annotations

from app.core.response import APIResponse, envelope_response


def test_apiresponse_default_values():
    resp = APIResponse()
    assert resp.message == "success"
    assert resp.data is None


def test_apiresponse_with_data():
    resp = APIResponse(message="ok", data={"id": 1})
    assert resp.message == "ok"
    assert resp.data == {"id": 1}


def test_apiresponse_model_dump():
    resp = APIResponse(message="created", data=[1, 2, 3])
    dumped = resp.model_dump()
    assert dumped == {"message": "created", "data": [1, 2, 3]}


def test_envelope_response_default_status():
    resp = envelope_response(data={"key": "value"})
    assert resp.status_code == 200
    body = resp.body.decode()
    # JSONResponse produces compact JSON (no spaces)
    assert '"message":"success"' in body
    assert '"data":{"key":"value"}' in body


def test_envelope_response_custom_status_and_message():
    resp = envelope_response(
        message="not found", status_code=404
    )
    assert resp.status_code == 404
    assert b'"message":"not found"' in resp.body


def test_envelope_response_with_none_data():
    resp = envelope_response()
    assert b'"data":null' in resp.body
