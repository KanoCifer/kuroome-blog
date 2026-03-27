from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.des.auth import manager
from app.api.des.des import ai_service_dep
from app.schemas.aiagent import (
    ArticleSummaryRequest,
    ChatRequest,
    HistoryRequest,
)
from app.services.ai_service import AiService

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/summary/stream")
async def summary_article_stream(
    payload: ArticleSummaryRequest,
    user=Depends(manager),
    ai_service: AiService = Depends(ai_service_dep),
):
    event_generator = ai_service.summary_stream(payload, str(user.id))

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
async def chat_stream(
    payload: ChatRequest,
    user=Depends(manager),
    ai_service: AiService = Depends(ai_service_dep),
):
    event_generator = ai_service.chat_stream(payload, str(user.id))

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
    user=Depends(manager),
    ai_service: AiService = Depends(ai_service_dep),
):
    return await ai_service.get_user_history(str(user.id))


@router.post("/history/summary")
async def get_cached_summary(
    payload: HistoryRequest,
    user=Depends(manager),
    ai_service: AiService = Depends(ai_service_dep),
):
    return await ai_service.get_cached_summary(payload, str(user.id))


@router.post("/history/chat")
async def get_cached_chat(
    payload: HistoryRequest,
    user=Depends(manager),
    ai_service: AiService = Depends(ai_service_dep),
):
    return await ai_service.get_cached_chat(payload, str(user.id))


@router.get("/debug/sessions")
async def debug_sessions(
    ai_service: AiService = Depends(ai_service_dep),
):
    return ai_service.get_debug_sessions()
