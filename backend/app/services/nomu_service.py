"""Nomu 服务 — NomuDesign 相关的单发无状态 LLM 能力（提示词优化等）。"""

from app.core.exceptions import APIError
from app.core.llm_factory import create_agent
from app.core.llm_prompts import NOMU_PROMPT_OPTIMIZE_INSTRUCTIONS
from app.core.logger import logger
from app.schemas.nomu import PromptOptimizeResult
from app.schemas.translate import UsageMetrics
from app.services.llm_usage_service import record_llm_usage


class NomuService:
    """Nomu服务（无状态）：一次调用优化一段图生成提示词。"""

    def __init__(self, model):
        self.model = model

    async def optimize_prompt(
        self, prompt: str, user_id: int | None = None
    ) -> PromptOptimizeResult:
        """把用户输入的图生成提示词优化改写，返回 ``PromptOptimizeResult``。

        与 ``TranslateService.translate`` 同款：``use_json_mode=True`` +
        ``output_schema`` 让 Ling 网关原生结构化输出；``tools=[]`` 不挂工具。
        token 消耗经 ``record_llm_usage``（``source="nomu_prompt_optimize"``）
        落库，失败不阻断。LLM 调用失败抛 ``APIError(502)``，由全局异常处理
        器转成标准错误信封，不裸 500。
        """
        agent = create_agent(
            model=self.model,
            instructions=NOMU_PROMPT_OPTIMIZE_INSTRUCTIONS,
            db=None,
            tools=[],
            use_json_mode=True,
        )
        try:
            response = await agent.arun(
                prompt, output_schema=PromptOptimizeResult
            )
        except Exception as exc:
            logger.error(f"❌ 提示词优化调用失败: {exc!r}")
            raise APIError(
                "提示词优化服务暂时不可用，请稍后重试", code=502
            ) from exc

        result: PromptOptimizeResult = response.content  # pyright: ignore[reportAssignmentType]

        metrics = getattr(response, "metrics", None)
        if metrics is not None:
            input_tokens = getattr(metrics, "input_tokens", 0) or 0
            output_tokens = getattr(metrics, "output_tokens", 0) or 0
            total_tokens = getattr(metrics, "total_tokens", 0) or 0
            duration = getattr(metrics, "duration", None)
            duration_ms = (
                round(duration * 1000) if duration is not None else None
            )
            usage = UsageMetrics(
                model=self.model.id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                duration_ms=duration_ms,
            )
            result = result.model_copy(update={"usage": usage})
            await record_llm_usage(
                source="nomu_prompt_optimize",
                model=self.model.id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                user_id=user_id,
                duration_ms=duration_ms,
                meta={"prompt_len": len(prompt)},
            )

        logger.bind(prompt=prompt).info(
            "nomu_prompt_optimize", response=result.prompt
        )
        return result
