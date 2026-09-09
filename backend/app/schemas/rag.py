"""RAG Knowledge 服务 schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    """RAG 问答请求体"""

    question: str = Field(..., min_length=1, description="用户问题")
    top_k: int = Field(default=5, ge=1, le=20, description="检索段落数")
    session_id: str | None = Field(
        default=None, description="会话 ID（多轮对话复用）"
    )


class IngestResponse(BaseModel):
    """文档入库响应"""

    ingested: int = Field(description="成功入库的文档数")
    chunks: int = Field(description="生成的段落总数")


class KnowledgeStatus(BaseModel):
    """知识库状态"""

    documents: int = Field(description="已索引文档数")
    source_dir: str = Field(description="知识源目录")
