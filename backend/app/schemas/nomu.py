"""NomuDesign API schemas."""

from pydantic import BaseModel, Field

from app.schemas.translate import UsageMetrics


class PromptOptimizeRequest(BaseModel):
    """``POST /v2/nomu/prompt-optimize`` 请求体"""

    prompt: str = Field(min_length=1, description="用户输入的图生成提示词")


class PromptOptimizeResult(BaseModel):
    """LLM 结构化输出（``output_schema``）；API 响应见 ``PromptOptimizeResponse``。"""

    prompt: str = Field(..., description="优化后的提示词")
    usage: UsageMetrics | None = Field(
        None, description="本次调用的 token 消耗（可选，向后兼容）"
    )


class PromptOptimizeResponse(PromptOptimizeResult):
    """``POST /v2/nomu/prompt-optimize`` 响应体（``data`` 字段）"""

    credits_spent: float | None = Field(
        None, description="本次实扣积分（分；退款后不回填）"
    )
