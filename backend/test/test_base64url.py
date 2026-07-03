"""Unit tests for app.utils.base64url — round-trip encode/decode."""

from __future__ import annotations

from app.utils.base64url import base64url_decode, base64url_encode


def test_encode_returns_string_without_padding():
    encoded = base64url_encode("hello world")
    assert isinstance(encoded, str)
    assert "=" not in encoded


def test_encode_bytes_input():
    encoded = base64url_encode(b"\x00\x01\x02\xff")
    assert isinstance(encoded, str)
    assert "=" not in encoded


def test_decode_roundtrip_text():
    original = "hello world"
    assert base64url_decode(base64url_encode(original)) == original


def test_decode_roundtrip_bytes_that_are_valid_utf8():
    # base64url_decode always returns str (decodes utf-8), so round-trip
    # only works for byte sequences that are valid utf-8.
    original = b"hello\x00world"
    assert base64url_decode(base64url_encode(original)).encode("utf-8") == original


def test_decode_handles_missing_padding():
    # "a" → 1 byte → base64 would be "YQ==" but urlsafe gives "YQ"
    encoded = base64url_encode("a")
    assert encoded == "YQ"
    assert base64url_decode(encoded) == "a"


def test_decode_handles_already_padded_input():
    assert base64url_decode("YQ==") == "a"


def test_encode_empty_string():
    assert base64url_encode("") == ""
    assert base64url_decode("") == ""


def test_encode_unicode():
    original = "你好世界🌊"
    assert base64url_decode(base64url_encode(original)) == original
