"""Standardized API response — Pydantic envelope + ORJSONResponse helper.

- ``APIResponse[T]`` — Pydantic generic envelope; use as ``response_model``
  annotation so OpenAPI / type tooling sees the wrapper shape.
- ``envelope_response(...)`` — returns an ``ORJSONResponse`` with the same
  envelope content. Use this when an endpoint also needs to mutate the
  response (cookies, headers).

The wire format is intentionally minimal: ``{message, data}``. HTTP status
code is the source of truth for success/failure — error envelopes are
emitted by handlers in ``app.core.exceptions``.
"""

from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse
from pydantic import BaseModel


class APIResponse[T](BaseModel):
    """Unified response envelope."""

    message: str = "success"
    data: T | None = None


def envelope_response(
    data: Any = None,
    message: str = "success",
    status_code: int = 200,
) -> JSONResponse:
    """Return a JSONResponse wrapped in the standard envelope.

    Use when the endpoint also needs to ``set_cookie`` / mutate headers.
    Otherwise prefer returning a dict and annotating ``response_model=APIResponse[T]``.
    """
    return JSONResponse(
        status_code=status_code,
        content={"message": message, "data": data},
    )
