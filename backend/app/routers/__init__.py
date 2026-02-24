"""Routers package for FastAPI.

This package contains all FastAPI routers for the application.
Each router is included in the main FastAPI application.
"""

from __future__ import annotations

from app.routers.auth import router as auth_router

__all__ = ["auth_router"]
