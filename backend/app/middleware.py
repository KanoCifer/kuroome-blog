from __future__ import annotations

import time
from typing import TYPE_CHECKING

from fastapi import Request
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core import get_settings

if TYPE_CHECKING:
    from fastapi import FastAPI

origins: list[str] = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://kanocifer.chat",
    "https://m.kanocifer.chat",
    "https://api.kanocifer.chat",
]


def register_middleware(app: FastAPI) -> None:
    app.add_middleware(SessionMiddleware, secret_key=get_settings().SECRET_KEY)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Set-Cookie"],
    )

    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        from app.core import logger as app_logger

        start_time: float = time.perf_counter()
        response = await call_next(request)
        process_time: float = round(time.perf_counter() - start_time, 6)

        if process_time > 1.0:
            app_logger.warning(
                f"Request to {request.url.path} took {process_time}s and returned status code {response.status_code}"
            )
        response.headers["X-Process-Time"] = f"{process_time}s"
        return response
