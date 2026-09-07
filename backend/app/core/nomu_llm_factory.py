from agno.agent import Agent
from agno.db.postgres import AsyncPostgresDb
from agno.models.base import Model
from agno.models.openai import OpenAIChat

from app.core.config import get_settings


def create_postgres_db() -> AsyncPostgresDb:
    """创建 AsyncPostgresDb"""
    try:
        return AsyncPostgresDb(db_url=get_settings().LEARNING_DATABASE_URL)
    except Exception as exc:
        raise RuntimeError(f"Failed to create Redis DB: {exc!r}") from exc


def create_nomu_model():
    "创建模型实例"
    return OpenAIChat(
        id="Ling-2.6-1T",
        api_key=get_settings().API_KEY,
        base_url="https://api.ant-ling.com/v1",
        timeout=60,
        role_map={
            "system": "system",
            "user": "user",
            "assistant": "assistant",
            "tool": "tool",
            "model": "assistant",
        },
        extra_body={"reasoning": {"effort": "high"}},
    )


def create_agent(
    model: Model,
    instructions: str,
    db: AsyncPostgresDb,
    **kwargs,
) -> Agent:
    "创建 Agent 实例"
    return Agent(
        model=model,
        instructions=instructions,
        db=db,
        markdown=True,
        **kwargs,
    )
