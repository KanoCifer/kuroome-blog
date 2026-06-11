"""AI agent schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ArticleSummaryRequest(BaseModel):
    """文章总结请求体"""

    content: str = Field(min_length=1, description="文章正文")
    title: str | None = Field(default=None, description="文章标题")
    model: str | None = Field(default=None, description="模型名称")


class ChatRequest(BaseModel):
    """对话请求体"""

    message: str = Field(min_length=1, description="用户消息")
    session_id: str = Field(min_length=1, description="会话 ID")
    article_content: str | None = Field(default=None, description="文章正文")
    article_title: str | None = Field(default=None, description="文章标题")
    model: str | None = Field(default=None, description="模型名称")


class HistoryRequest(BaseModel):
    """缓存查询请求体 - 用于查询历史总结/对话缓存 (POST 代替 GET, 避免 URL 过长导致 431 错误)"""

    article_content: str = Field(min_length=1, description="文章正文")
    article_title: str | None = Field(default=None, description="文章标题")


class SummaryInput(BaseModel):
    """文章总结输入模型 (用于 Agno Agent)"""

    content: str = Field(description="需要总结的文章正文")
    title: str | None = Field(default=None, description="文章标题")


class WeatherAnalysisInput(BaseModel):
    """天气分析输入模型"""

    weather_data: dict = Field(..., description="需要分析的天气数据")
    model_id: str | None = Field(
        default=None, description="AI 模型 ID，默认使用配置中的模型"
    )
