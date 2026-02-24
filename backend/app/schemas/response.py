"""API Response schemas for standardized API responses."""

from typing import Literal

from fastapi.responses import JSONResponse
from pydantic import BaseModel


class APIResponse(BaseModel):
    """Standardized API response model."""

    status: Literal["success", "error"]
    data: dict | list | None = None
    message: str | None = None
    code: int | None = None

    @classmethod
    def ok(
        cls,
        data: dict | list | None = None,
        message: str = "success",
        code: int = 200,
    ):
        """成功响应的便捷方法"""
        return cls(
            status="success",
            data=data,
            message=message,
            code=code,
        )

    @classmethod
    def error(cls, message: str, code: int = 400):
        """错误响应的便捷方法 - 返回带 HTTP 状态码的 JSONResponse"""
        return JSONResponse(
            status_code=code,
            content=cls(
                status="error", message=message, code=code
            ).model_dump(),
        )
