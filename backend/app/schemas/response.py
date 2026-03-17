"""API Response schemas for standardized API responses."""

from typing import Literal

from fastapi.responses import JSONResponse
from pydantic import BaseModel


class APIResponse(BaseModel):
    """标准化 API 响应模型。包含状态、数据、消息和代码等字段"""

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
    ) -> JSONResponse:
        """成功响应的便捷方法"""
        return JSONResponse(
            status_code=code,
            content=cls(
                status="success", data=data, message=message, code=code
            ).model_dump(mode="json"),
        )

    @classmethod
    def error(cls, message: str, code: int = 400) -> JSONResponse:
        """错误响应的便捷方法 - 返回带 HTTP 状态码的 JSONResponse"""
        return JSONResponse(
            status_code=code,
            content=cls(status="error", message=message, code=code).model_dump(
                mode="json"
            ),
        )
