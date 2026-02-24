from typing import Any

from flask import Response, jsonify


# ============================================================================
class APIResponse:
    @staticmethod
    def api_response(
        data: Any | None = None,
        message: str = "",
        status: str = "success",
        code: int = 200,
        **kwargs: Any,
    ) -> tuple[Response, int]:
        """Create a standardized API response.

        Args:
            data: Response data payload
            message: Human-readable message
            status: Status string ("success", "error", etc.)
            code: HTTP status code
            **kwargs: Additional fields to include in response

        Returns:
            Tuple of (JSON response, HTTP status code)
        """
        response = {
            "status": status,
            "message": message,
            "data": data if data is not None else {},
            **kwargs,
        }
        return jsonify(response), code

    @staticmethod
    def error_response(
        message: str,
        code: int = 400,
        errors: dict[str, Any] | None = None,
    ) -> tuple[Response, int]:
        """Create a standardized error response.

        Args:
            message: Error message
            code: HTTP status code (default: 400 Bad Request)
            errors: Detailed validation errors

        Returns:
            Tuple of (JSON response, HTTP status code)
        """
        return APIResponse.api_response(
            message=message,
            status="error",
            code=code,
            errors=errors or {},
        )
