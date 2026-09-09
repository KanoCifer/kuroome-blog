"""共享 LLM Agent 工厂 — 为 AiAgent 提供统一的 model / agent / db 创建。"""

from __future__ import annotations

import inspect
import re
import time
from collections.abc import Callable
from typing import Any

from agno.agent import Agent
from agno.db.postgres import AsyncPostgresDb
from agno.knowledge.embedder import Embedder
from agno.knowledge.embedder.openai import OpenAIEmbedder
from agno.knowledge.knowledge import Knowledge
from agno.models.base import Model
from agno.models.deepseek import DeepSeek
from agno.models.openai import OpenAIChat
from agno.tools.websearch import WebSearchTools
from agno.vectordb.pgvector import PgVector, SearchType

from app.core.config import get_settings
from app.core.logger import logger


def create_embedder() -> Embedder:
    embedder = OpenAIEmbedder(
        id="Qwen/Qwen3-Embedding-8B",
        base_url="https://api.siliconflow.cn/v1/embeddings",
        api_key=get_settings().SILICONFLOW_API_KEY,
    )
    return embedder


# ── PgVector + Knowledge（延迟初始化）────────────────────────────────── #
# Agno 的 PgVector 内部用同步 SQLAlchemy（create_engine + sessionmaker），
# 不能接受 postgresql+asyncpg:// URL（会报 MissingGreenlet）。
# 解决方案：剥离 +asyncpg 方言后缀，用同步 psycopg2 驱动连接。

def _sync_db_url(url: str) -> str:
    """将 postgresql+asyncpg:// 转为 postgresql://，供同步引擎使用。"""
    return re.sub(r"\+asyncpg", "", url)


vector_db = PgVector(
    db_url=_sync_db_url(get_settings().LEARNING_DATABASE_URL),
    table_name="agno_rag_documents",
    embedder=create_embedder(),
    search_type=SearchType.hybrid,
    vector_score_weight=0.7,
)

# 绕过 __post_init__，避免同步 create() 触发异步 IO
knowledge: Knowledge = object.__new__(Knowledge)
knowledge.vector_db = vector_db
knowledge.max_results = 5
# Agno 升级时若 Knowledge.__init__ 新增必要属性，这里立刻暴露。
assert hasattr(knowledge, "search") and hasattr(knowledge, "insert"), \
    "Knowledge 半初始化 — 检查 Agno 版本兼容性"


async def init_knowledge() -> None:
    """异步初始化 Knowledge（创建表 + 启用混合检索索引）。

    必须在 FastAPI lifespan 的异步上下文中调用一次。
    """
    await vector_db.create()
    logger.info("knowledge vector_db initialized", table=vector_db.table_name)


def get_knowledge() -> Knowledge:
    """返回共享的 Knowledge 单例（混合检索已开启）。"""
    return knowledge


def create_postgres_db() -> AsyncPostgresDb:
    """创建共享 AsyncPostgresDb 实例。"""
    try:
        return AsyncPostgresDb(db_url=get_settings().LEARNING_DATABASE_URL)
    except Exception as exc:
        raise RuntimeError(f"Failed to create Postgres DB: {exc!r}") from exc


def create_llm_model(
    model_id: str = "Ling-2.6-1T",
    *,
    temperature: float = 1,
    timeout: int = 60,
) -> OpenAIChat:
    """创建 OpenAI 模型实例。"""
    extra_body = {"reasoning": {"effort": "high"}}

    return OpenAIChat(
        id=model_id,
        api_key=get_settings().API_KEY,
        base_url="https://api.ant-ling.com/v1",
        temperature=temperature,
        timeout=timeout,
        role_map={
            "system": "system",
            "user": "user",
            "assistant": "assistant",
            "tool": "tool",
            "model": "assistant",
        },
        extra_body=extra_body,
    )


# Learning 模块可用模型元数据
# ``GET /v2/learning/models`` 端点数据与 :func:`create_deepseek_model` 的白名单
# 校验都从这里出，避免前端与后端硬编码同步漂移。
LEARNING_MODELS = (
    {"id": "deepseek-v4-flash", "label": "Flash（快速）", "is_premium": False},
    {"id": "deepseek-v4-pro", "label": "Pro（深度）", "is_premium": True},
)
LEARNING_MODEL_IDS = frozenset(m["id"] for m in LEARNING_MODELS)


def create_deepseek_model(
    model_id: str = "deepseek-v4-flash", **kwargs
) -> DeepSeek:
    """创建 DeepSeek 模型实例（用于 Learning 模块）。

    Args:
        model_id: 必须落在 :data:`LEARNING_MODEL_IDS` 白名单内。
        timeout: HTTP 超时秒数。

    Returns:
        已配置好的 :class:`DeepSeek` 实例。

    Raises:
        RuntimeError: ``DEEPSEEK_API_KEY`` 未配置。
        ValueError: ``model_id`` 不在白名单内。
    """
    if model_id not in LEARNING_MODEL_IDS:
        raise ValueError(
            f"Unsupported DeepSeek model_id: {model_id!r}. "
            f"Allowed: {sorted(LEARNING_MODEL_IDS)}"
        )

    api_key = get_settings().DEEPSEEK_API_KEY
    if not api_key:
        raise RuntimeError(
            "AI 服务未配置 DEEPSEEK_API_KEY（Learning 模块依赖）"
        )

    return DeepSeek(
        id=model_id,
        api_key=api_key,
        reasoning_effort="high",
    )


def create_web_search_tools() -> WebSearchTools:
    """创建 WebSearchTools 实例。"""
    return WebSearchTools(backend="bing")


async def _log_tool_call(
    function_name: str, function_call: Callable, arguments: dict[str, Any]
) -> Any:
    """每次工具调用的耗时日志（tool_hooks 中间件）"""
    start = time.monotonic()
    result = function_call(**arguments)
    if inspect.isawaitable(result):
        result = await result
    logger.info(
        "tool call finished",
        tool=function_name,
        args_keys=sorted(arguments),
        duration=round(time.monotonic() - start, 4),
    )
    return result


def create_agent(
    *,
    model: Model,
    instructions: str,
    db: AsyncPostgresDb | None = None,
    tools: list | None = None,
    tool_hooks: list | None = None,
    **kwargs,
) -> Agent:
    """创建 Agno Agent 实例（默认挂 ``_log_tool_call`` 耗时 hook）。"""
    return Agent(
        model=model,
        instructions=instructions,
        tools=tools if tools is not None else [create_web_search_tools()],
        tool_hooks=tool_hooks if tool_hooks is not None else [_log_tool_call],
        db=db,
        markdown=True,
        add_history_to_context=True,
        num_history_runs=50,
        **kwargs,
    )
