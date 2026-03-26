from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.des.auth import manager
from app.core import logger
from app.core.agent import ArticleSummarizer, article_summarizer
from app.schemas.aiagent import (
    ArticleSummaryRequest,
    ChatRequest,
    HistoryRequest,
)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/summary/stream")
async def summary_article_stream(
    payload: ArticleSummaryRequest, user=Depends(manager)
):
    """文章总结 - 使用 Server-Sent Events (SSE) 实时返回总结结果"""

    async def event_generator():
        try:
            async for chunk in article_summarizer.run_summarization_astream(
                content=payload.content,
                title=payload.title,
                user_id=str(user.id),
            ):
                chunk_str = str(chunk)
                data = {
                    "content": chunk_str,
                    "is_end": False,
                }
                yield f"data:{json.dumps(data, ensure_ascii=False)}\n\n"

            done = {
                "content": "",
                "is_end": True,
            }
            yield f"data:{json.dumps(done, ensure_ascii=False)}\n\n"
        except ValueError as e:
            yield f"data:{json.dumps({'content': f'[ERROR] {e!r}', 'is_end': True}, ensure_ascii=False)}\n\n"
        except RuntimeError as e:
            yield f"data:{json.dumps({'content': f'[ERROR] {e!r}', 'is_end': True}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"❌ 文章总结失败: {e!r}")
            yield f"data:{json.dumps({'content': '[ERROR] 文章总结失败,请稍后重试', 'is_end': True}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest, user=Depends(manager)):
    """对话接口 - 使用 Server-Sent Events (SSE) 实时返回对话结果"""

    async def event_generator():
        try:
            async for chunk in article_summarizer.chat_stream(
                message=payload.message,
                session_id=payload.session_id,
                user_id=str(user.id),
                article_content=payload.article_content,
                article_title=payload.article_title,
            ):
                chunk_str = str(chunk)
                data = {
                    "content": chunk_str,
                    "is_end": False,
                }
                yield f"data:{json.dumps(data, ensure_ascii=False)}\n\n"

            done = {
                "content": "",
                "is_end": True,
            }
            yield f"data:{json.dumps(done, ensure_ascii=False)}\n\n"
        except ValueError as e:
            yield f"data:{json.dumps({'content': f'[ERROR] {e!r}', 'is_end': True}, ensure_ascii=False)}\n\n"
        except RuntimeError as e:
            yield f"data:{json.dumps({'content': f'[ERROR] {e!r}', 'is_end': True}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"❌ 对话失败: {e!r}")
            yield f"data:{json.dumps({'content': '[ERROR] 对话失败,请稍后重试', 'is_end': True}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history")
async def get_user_history(user=Depends(manager)):
    """获取用户的所有会话历史"""
    sessions = await article_summarizer.get_user_sessions(user_id=str(user.id))
    return {"sessions": sessions}


@router.post("/history/summary")
async def get_cached_summary(payload: HistoryRequest, user=Depends(manager)):
    """查询指定文章的历史总结缓存"""
    result = await article_summarizer.get_summary_session(
        user_id=str(user.id),
        title=payload.article_title,
        content=payload.article_content,
    )
    if result:
        return {"cached": True, **result}
    return {"cached": False}


@router.post("/history/chat")
async def get_cached_chat(payload: HistoryRequest, user=Depends(manager)):
    """查询指定文章的历史对话缓存"""
    result = await article_summarizer.get_chat_session(
        user_id=str(user.id),
        title=payload.article_title,
        content=payload.article_content,
    )
    if result:
        return {"cached": True, **result}
    return {"cached": False}


@router.get("/debug/sessions")
async def debug_sessions():
    from agno.db.base import SessionType

    sessions = ArticleSummarizer.DB.get_sessions(
        session_type=SessionType.AGENT
    )
    result = []
    for s in sessions[:5]:
        if isinstance(s, dict):
            result.append(s)
        else:
            result.append(
                {
                    "session_id": getattr(s, "session_id", None),
                    "user_id": getattr(s, "user_id", None),
                    "run_count": len(getattr(s, "runs", []) or []),
                    "created_at": getattr(s, "created_at", None),
                }
            )
    return {"total": len(sessions), "sessions": result}
