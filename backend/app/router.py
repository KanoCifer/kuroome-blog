from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from fastapi.staticfiles import StaticFiles

from app.api.v1 import (
    admin,
    auth,
    blog,
    moments,
    monitor,
    public,
    publish,
    rss,
)
from app.api.v2 import (
    device,
    fishing,
    friendlinks,
    llm,
    subscriptions,
    system,
    weather,
)
from app.api.v2 import (
    devtasks as devtasks_v2,
)
from app.api.v2 import public as public_v2
from app.api.v2 import (
    weread as weread_v2,
)

if TYPE_CHECKING:
    from fastapi import FastAPI


def register_router(app: FastAPI):
    # Include routers
    # v1 版本API
    app.include_router(router=admin.router, prefix="/api/v1")
    app.include_router(router=auth.router, prefix="/api/v1")
    app.include_router(router=blog.router, prefix="/api/v1")
    app.include_router(router=moments.router, prefix="/api/v1")
    app.include_router(router=public.router, prefix="/api/v1")
    app.include_router(router=rss.router, prefix="/api/v1")
    app.include_router(router=monitor.router, prefix="/api/v1")
    app.include_router(router=publish.router, prefix="/api/v1")

    # v2 版本API
    app.include_router(router=subscriptions.router, prefix="/api/v2")
    app.include_router(router=llm.router, prefix="/api/v2")
    app.include_router(router=device.router, prefix="/api/v2")
    app.include_router(router=fishing.router, prefix="/api/v2")
    app.include_router(router=weather.router, prefix="/api/v2")
    app.include_router(router=public_v2.router, prefix="/api/v2")
    app.include_router(router=friendlinks.router, prefix="/api/v2")
    app.include_router(router=devtasks_v2.router, prefix="/api/v2")
    app.include_router(router=weread_v2.router, prefix="/api/v2")
    app.include_router(router=system.router, prefix="/api/v2")


def setup_media(app: FastAPI) -> None:
    media_dir: Path = Path(__file__).resolve().parent.parent / "media"
    app.mount(
        path="/api/v1/media/",
        app=StaticFiles(directory=media_dir),
        name="media",
    )
