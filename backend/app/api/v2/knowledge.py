"""v2 Knowledge API — RAG 知识库问答。

端点契约：
- ``POST /v2/knowledge/ask``       → SSE 流式问答（混合检索 + LLM 生成）
- ``POST /v2/knowledge/ingest``    → 触发文档入库（扫描 KNOWLEDGE_SOURCE_DIR）
- ``GET  /v2/knowledge/status``    → 知识库状态（文档数 / 段落数）
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, Request, status
from fastapi.sse import EventSourceResponse

from app.api.des.auth import optional_user
from app.api.des.limiter import client_key, limiter
from app.appstate import AppState, get_app_state
from app.core.response import APIResponse
from app.schemas.rag import AskRequest, IngestResponse, KnowledgeStatus

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post("/ask", response_class=EventSourceResponse)
@limiter.limit("30/minute")
async def ask(
    payload: AskRequest,
    request: Request,
    user: int | None = Depends(optional_user),
    state: AppState = Depends(get_app_state),
):
    """RAG 流式问答：混合检索文档 + LLM 生成回答。

    ``top_k`` 控制检索段落数（1-20，默认 5）。
    ``session_id`` 可选，多轮对话复用同一会话。
    """
    user_id = str(user) if user else f"anon:{client_key(request)}"

    async for chunk in state.rag_svc.ask(
        question=payload.question,
        top_k=payload.top_k,
        session_id=payload.session_id,
        user_id=user_id,
    ):
        yield chunk


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/hour")
async def ingest(
    request: Request,
    user: int | None = Depends(optional_user),
    state: AppState = Depends(get_app_state),
):
    """触发文档入库：扫描源目录下的 Markdown 文件，切片后写入向量库。

    异步执行，立即返回 202。限流 5 次/小时，避免重复嵌入造成 API 开销。
    入库结果通过日志查看。
    """
    asyncio.create_task(state.rag_svc.ingest_documents())
    return {"message": "文档入库任务已启动，请稍后通过 /status 查询结果"}


@router.get("/status", response_model=APIResponse[KnowledgeStatus])
async def status(
    state: AppState = Depends(get_app_state),
):
    """查询知识库当前状态（文档数 / 段落数 / 源目录）。"""
    result = state.rag_svc.get_status()
    return APIResponse(
        data=KnowledgeStatus(**result),
        message="success",
    )
