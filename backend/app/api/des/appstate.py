"""FastAPI dependency that hands router handlers the AppState singleton.

Usage::

    @router.get("/…")
    async def handler(state: AppState = Depends(get_app_state), ...):
        ...
"""

from __future__ import annotations

from fastapi import Request

from app.appstate import AppState


async def get_app_state(request: Request) -> AppState:
    """Return the AppState singleton mounted on ``app.state.services`` by lifespan."""
    return request.app.state.services


__all__ = ["get_app_state"]
