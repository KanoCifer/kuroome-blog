"""Standardized API response — JSONResponse subclass for direct use in endpoints."""

from __future__ import annotations

from starlette.responses import JSONResponse


class APIResponse(JSONResponse):
    """Unified response envelope. Use `APIResponse.ok(...)` to return directly from endpoints."""

    @staticmethod
    def ok(
        data: dict | list | None = None,
        message: str = "success",
        status_code: int = 200,
    ) -> APIResponse:
        return APIResponse(
            status_code=status_code,
            content={"status": "success", "message": message, "data": data},
        )
