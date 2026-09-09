"""RAG Knowledge 服务 — 本地文档知识库问答。

基于 Agno Knowledge + PgVector 混合检索（向量 + BM25），
文档源来自 ``KNOWLEDGE_SOURCE_DIR`` 目录下的 Markdown 文件。
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator
from pathlib import Path

from agno.agent import RunOutputEvent
from agno.knowledge.chunking.markdown import MarkdownChunking
from agno.knowledge.knowledge import Knowledge
from agno.knowledge.reader.markdown_reader import MarkdownReader
from agno.run.agent import ReasoningContentDeltaEvent

from app.core.llm_factory import create_agent, create_llm_model
from app.core.logger import logger
from app.services.llm_usage_service import record_llm_usage

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


def search_nomu_docs(query: str, max_results: int = 5) -> str:
    """搜索 Nomu 文档知识库并返回格式化结果（Agno tool 用）。"""
    from app.core.llm_factory import get_knowledge

    results = get_knowledge().search(query, max_results=max_results)
    return _format_search_results(results)


class RagService:
    """RAG 知识库服务：文档入库 + 混合检索 + 流式问答。"""

    def __init__(self, knowledge: Knowledge, source_dir: str) -> None:
        self.knowledge = knowledge
        self.source_dir = Path(source_dir)

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

    # ── 流式问答 ───────────────────────────────────────────────────── #

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

        Yields:
            {type: "reasoning"|"content", content: str, is_end: bool}
        """
        if not question.strip():
            yield {
                "type": "content",
                "content": "[ERROR] 问题不能为空",
                "is_end": True,
            }
            return

        # ── 首轮检索：service 层直接查，注入 prompt ───────────────
        retrieved = self._search_knowledge(question, top_k)
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

        full_prompt = f"{context_block}用户问题：{question}"

        model = create_llm_model()
        agent = create_agent(
            model=model,
            instructions=_RAG_SYSTEM_PROMPT,
            tools=[search_nomu_docs],  # 后续补充检索工具
        )

        start_time = time.monotonic()
        input_tokens = output_tokens = total_tokens = 0

        try:
            async for event in agent.arun(
                full_prompt,
                stream=True,
                stream_events=True,
                user_id=user_id,
                session_id=session_id,
            ):
                if (
                    isinstance(event, ReasoningContentDeltaEvent)
                    and event.reasoning_content
                ):
                    yield {
                        "type": "reasoning",
                        "content": str(event.reasoning_content),
                    }
                elif isinstance(event, RunOutputEvent) and event.content:
                    yield {
                        "type": "content",
                        "content": str(event.content),
                    }

            # 从 agent 运行结果提取 usage
            run_output = agent.get_last_run_output()
            if run_output and run_output.metrics:
                metrics = run_output.metrics
                input_tokens = getattr(metrics, "input_tokens", 0) or 0
                output_tokens = getattr(metrics, "output_tokens", 0) or 0
                total_tokens = getattr(metrics, "total_tokens", 0) or 0

        except Exception as exc:
            logger.error(f"❌ RAG 问答失败: {exc!r}")
            yield {
                "type": "content",
                "content": "[ERROR] 知识库问答服务暂时不可用，请稍后重试",
                "is_end": True,
            }
            return
        finally:
            # 异步记录 usage，不阻塞响应
            duration_ms = round((time.monotonic() - start_time) * 1000)
            if total_tokens > 0:
                # user_id 形如 "123"（登录用户）或 "anon:ip"（匿名），仅前者可转 int
                numeric_id = int(user_id) if user_id and user_id.isdigit() else None
                await record_llm_usage(
                    source=LLM_USAGE_SOURCE,
                    model=model.id,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                    user_id=numeric_id,
                    duration_ms=duration_ms,
                    meta={"question": question[:200], "top_k": top_k},
                )

        yield {"type": "content", "content": "", "is_end": True}

    @staticmethod
    def _search_knowledge(query: str, top_k: int) -> str:
        """检索知识库并格式化结果（首轮 service 层直接查，注入 prompt）。"""
        from app.core.llm_factory import get_knowledge

        results = get_knowledge().search(query, max_results=top_k)
        return _format_search_results(results)

    # ── 状态查询 ───────────────────────────────────────────────────── #

    def get_status(self) -> dict:
        """返回知识库状态（文档数 / 源目录）。"""
        # ponytail: Agno Knowledge 不直接暴露 count，num_documents 为 None 时
        # 返回 0；后续若 PgVector 暴露 count() 可替换为真实查询。
        docs = getattr(self.knowledge, "num_documents", None) or 0
        return {
            "documents": docs,
            "source_dir": str(self.source_dir),
        }
