"""Custom exceptions and error handling for FastAPI application."""

from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# ============================================================================
# Custom Exception Classes
# ============================================================================


class APIError(Exception):
    """Base API error class.

    Attributes:
        message: Error message
        code: HTTP status code
        errors: Additional error details (e.g., validation errors)
    """

    def __init__(
        self,
        message: str,
        code: int = 500,
        errors: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.errors = errors or {}


class NotFoundError(APIError):
    """Resource not found error."""

    def __init__(
        self, message: str = "Resource not found", **kwargs: Any
    ) -> None:
        super().__init__(message=message, code=404, **kwargs)


class ValidationError(APIError):
    """Validation error exception."""

    def __init__(
        self,
        message: str = "Validation failed",
        errors: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(message=message, code=422, errors=errors, **kwargs)


class UnauthorizedError(APIError):
    """Unauthorized access error."""

    def __init__(self, message: str = "Unauthorized", **kwargs: Any) -> None:
        super().__init__(message=message, code=401, **kwargs)


class ForbiddenError(APIError):
    """Forbidden access error."""

    def __init__(self, message: str = "Forbidden", **kwargs: Any) -> None:
        super().__init__(message=message, code=403, **kwargs)


# ============================================================================
# Error Response Format
# ============================================================================


def create_error_response(
    message: str,
    code: int,
    status: str = "error",
    errors: dict[str, Any] | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    response = {
        "status": status,
        "message": message,
        "data": errors if errors is not None else {},
        **kwargs,
    }
    return response


# ============================================================================
# Exception Handlers
# ============================================================================


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Handle Starlette/FastAPI HTTP exceptions."""
    response_data = create_error_response(
        message=exc.detail,
        code=exc.status_code,
        status="error",
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle FastAPI request validation errors."""
    errors = {}
    for error in exc.errors():
        loc = ".".join(str(x) for x in error.get("loc", []))
        msg = error.get("msg", "")
        if loc:
            errors[loc] = msg
        else:
            errors["general"] = msg

    response_data = create_error_response(
        message="Validation failed",
        code=422,
        status="error",
        errors=errors,
    )
    return JSONResponse(
        status_code=422,
        content=response_data,
    )


async def api_exception_handler(
    request: Request, exc: APIError
) -> JSONResponse:
    """Handle custom API errors."""
    response_data = create_error_response(
        message=exc.message,
        code=exc.code,
        status="error",
        errors=exc.errors if exc.errors else None,
    )
    return JSONResponse(
        status_code=exc.code,
        content=response_data,
    )


async def generic_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handle unexpected exceptions (500 Internal Server Error)."""
    # Log the exception here if needed
    response_data = create_error_response(
        message="Internal server error",
        code=500,
        status="error",
    )
    return JSONResponse(
        status_code=500,
        content=response_data,
    )


# ============================================================================
# Register All Handlers
# ============================================================================


def register_exception_handlers(app: Any) -> None:
    """Register all exception handlers with the FastAPI application.

    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(
        RequestValidationError, validation_exception_handler
    )
    app.add_exception_handler(
        ResponseValidationError, validation_exception_handler
    )
    app.add_exception_handler(APIError, api_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
