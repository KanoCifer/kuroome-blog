from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.api.des.auth import optional_user
from app.api.des.des import ai_service_dep
from app.api.des.limiter import client_key, limiter
from app.models.models import User
from app.schemas.aiagent import (
    ArticleSummaryRequest,
    ChatRequest,
    HistoryRequest,
)
from app.services.ai_service import AiService

router = APIRouter(prefix="/agent", tags=["agent"])


def _resolve_user_id(user: User | None, request: Request) -> str:
    """把 `Depends(optional_user)` 的结果映射成 service 层要的 user_id 字符串。

    登录用户用真实 id；匿名用户退回到 `anon:<ip>`，IP 取自 `client_key`：
    反代下读 `X-Forwarded-For` 末段（真实访客 IP），直连退化到 `request.client.host`。
    同 IP 共享同一访客桶（被限流时也会被命中）。
    """
    if user is not None:
        return str(user.id)
    return f"anon:{client_key(request)}"


@router.post("/summary/stream")
@limiter.limit("5/minute")
async def summary_article_stream(
    request: Request,
    payload: ArticleSummaryRequest,
    user: User | None = Depends(optional_user),
    ai_service: AiService = Depends(ai_service_dep),
):
    event_generator = ai_service.summary_stream(
        payload, _resolve_user_id(user, request)
    )

    return StreamingResponse(
        event_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/stream")
@limiter.limit("20/minute")
async def chat_stream(
    request: Request,
    payload: ChatRequest,
    user: User | None = Depends(optional_user),
    ai_service: AiService = Depends(ai_service_dep),
):
    event_generator = ai_service.chat_stream(
        payload, _resolve_user_id(user, request)
    )

    return StreamingResponse(
        event_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history")
async def get_user_history(
    request: Request,
    user: User | None = Depends(optional_user),
    ai_service: AiService = Depends(ai_service_dep),
):
    return await ai_service.get_user_history(
        _resolve_user_id(user, request)
    )


@router.post("/history/summary")
async def get_cached_summary(
    request: Request,
    payload: HistoryRequest,
    user: User | None = Depends(optional_user),
    ai_service: AiService = Depends(ai_service_dep),
):
    return await ai_service.get_cached_summary(
        payload, _resolve_user_id(user, request)
    )


@router.post("/history/chat")
async def get_cached_chat(
    request: Request,
    payload: HistoryRequest,
    user: User | None = Depends(optional_user),
    ai_service: AiService = Depends(ai_service_dep),
):
    return await ai_service.get_cached_chat(
        payload, _resolve_user_id(user, request)
    )


@router.get("/debug/sessions")
async def debug_sessions(
    ai_service: AiService = Depends(ai_service_dep),
):
    return ai_service.get_debug_sessions()
