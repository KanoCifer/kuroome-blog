"""RAG 知识库服务 — 基于 :class:`QaService` 的文档问答。

只负责「知识库」这一层：文档入库 + 混合检索 + 把检索结果拼进 prompt。
流式问答与会话回读全部复用通用问答服务。
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from pathlib import Path

from agno.db.postgres import AsyncPostgresDb
from agno.knowledge.chunking.markdown import MarkdownChunking
from agno.knowledge.knowledge import Knowledge
from agno.knowledge.reader.markdown_reader import MarkdownReader

from app.core.logger import logger
from app.services.qa_service import QaService

# LLM usage 记录的 source 词表值
LLM_USAGE_SOURCE = "rag_qa"

# 默认检索段落数
DEFAULT_TOP_K = 5

# RAG Agent 系统提示
_RAG_SYSTEM_PROMPT = """你是一名知识库问答助手，基于提供的文档内容回答用户问题。

## 回答原则
- 优先从检索到的文档段落中找依据，给出准确、简洁的回答
- 引用原文关键句时，标注来源文件名
- 问题超出知识库范围时，明确说明「知识库中未找到相关信息」
- 不要编造文档中没有的内容

## 输出格式
- 用清晰的中文回答
- 关键信息分点列出
- 在末尾用 `> 来源: filename.md` 标注引用来源
"""


def _format_search_results(results) -> str:
    """格式化知识库检索结果为 [来源: name]\ncontent 字符串。"""
    formatted = []
    for r in results:
        content = getattr(r, "content", None) or r.get("content", "")
        name = getattr(r, "name", None) or r.get("name", "unknown")
        if len(content) > 500:
            content = content[:500] + "..."
        formatted.append(f"[来源: {name}]\n{content}")
    return "\n\n".join(formatted)


class RagService(QaService):
    """文档入库 + 混合检索 + 知识库问答。"""

    def __init__(
        self,
        knowledge: Knowledge,
        source_dir: str,
        db: AsyncPostgresDb | None = None,
    ) -> None:
        super().__init__(
            instructions=_RAG_SYSTEM_PROMPT,
            usage_source=LLM_USAGE_SOURCE,
            tools=[self.search_nomu_docs],
            db=db,
        )
        self.knowledge = knowledge
        self.source_dir = Path(source_dir)

    def search_nomu_docs(self, query: str, max_results: int = DEFAULT_TOP_K) -> str:
        """搜索 Nomu 文档知识库并返回格式化结果（Agno tool 用）。"""
        return _format_search_results(
            self.knowledge.search(query, max_results=max_results)
        )

    # ── 文档入库 ───────────────────────────────────────────────────── #

    async def ingest_documents(self) -> None:
        """扫描源目录，将所有 Markdown 文件切片后入库（异步后台任务）。"""
        if not self.source_dir.exists():
            logger.warning(
                "knowledge source dir not found", path=str(self.source_dir)
            )
            return

        md_files = list(self.source_dir.rglob("*.md"))
        if not md_files:
            logger.warning(
                "no markdown files found", path=str(self.source_dir)
            )
            return

        success = 0
        for md_file in md_files:
            try:
                # 在线程池执行同步 I/O + 嵌入
                await asyncio.to_thread(self._ingest_single_file, md_file)
                success += 1
            except Exception as exc:
                logger.warning(
                    "failed to ingest file",
                    file=str(md_file),
                    error=str(exc),
                )

        logger.info(
            "knowledge ingestion complete",
            documents=success,
            total=len(md_files),
        )

    def _ingest_single_file(self, file_path: Path) -> int:
        """入库单个 Markdown 文件。返回 0（insert 不返回计数，无需解析）。"""
        reader = MarkdownReader(
            chunking_strategy=MarkdownChunking(chunk_size=300),
        )
        # Knowledge.insert() 返回 None，不返回插入数量
        self.knowledge.insert(path=file_path, reader=reader)
        logger.debug("ingested file", file=file_path.name)
        return 0

    # ── 知识库问答 ─────────────────────────────────────────────────── #

    async def ask(
        self,
        question: str,
        top_k: int = DEFAULT_TOP_K,
        session_id: str | None = None,
        user_id: str | None = None,
    ) -> AsyncIterator[dict]:
        """基于知识库的流式问答。

        策略：首轮 service 层先检索注入 context，后续 agent 可按需调
        ``search_nomu_docs`` 工具补充检索（多轮对话场景）。
        """
        async for chunk in super().ask(
            self._build_prompt(question, top_k),
            session_id=session_id,
            user_id=user_id,
            meta={"question": question[:200], "top_k": top_k},
        ):
            yield chunk

    def _build_prompt(self, question: str, top_k: int) -> str:
        """首轮检索注入参考段落，拼成最终 prompt。"""
        retrieved = _format_search_results(
            self.knowledge.search(question, max_results=top_k)
        )
        if retrieved:
            context_block = (
                "以下是知识库中相关的参考段落，请基于它们回答用户问题。\n\n"
                f"{retrieved}\n\n"
                "如果参考段落不足以回答，你可以调用 ``search_nomu_docs`` "
                "工具搜索更多内容。\n\n"
                "---\n\n"
            )
        else:
            context_block = (
                "知识库中未找到直接相关的内容，你可以调用 "
                "``search_nomu_docs`` 工具尝试其他关键词搜索。\n\n---\n\n"
            )
        return f"{context_block}用户问题：{question}"

    # ── 状态查询 ───────────────────────────────────────────────────── #

    def get_status(self) -> dict:
        """返回知识库状态（文档数 / 源目录）。"""
        # ponytail: Agno Knowledge 不直接暴露 count，直查 PgVector 表行数。
        docs = self.knowledge.vector_db.get_count()
        return {
            "documents": docs,
            "source_dir": str(self.source_dir),
        }
