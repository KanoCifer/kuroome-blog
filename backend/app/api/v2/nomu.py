"""v2 nomu API — NomuDesign 配套 AI 能力（需登录，按积分扣费）。

鉴权：``get_current_user`` 强校验，未登录 401。
计费：``call_with_billing`` 统一编排——调 LLM 前 ``preconsume`` 预扣
（``source="nomu_prompt_optimize"``，价格见 ``credit_price`` seed）；LLM
失败/断开 ``refund`` 全额退并留 refund 流水；余额不足 402（不产生流水、不
调 LLM）。``Idempotency-Key`` 请求头为幂等键（缺省服务端 uuid4，校验在
service 层，见 ``credit_service._validate_biz_id``），同 key 重试不双扣。
限流：``@limiter.limit`` 按 IP（``client_key``）计数，与积分扣费并存的
第二道闸；超过阈值返回 429。
"""

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.des.auth import get_current_user
from app.api.des.db import get_session
from app.api.des.limiter import limiter
from app.api.v2._billing import call_with_billing
from app.appstate import AppState, get_app_state
from app.core.response import APIResponse
from app.schemas.nomu import PromptOptimizeRequest, PromptOptimizeResponse

router = APIRouter(prefix="/nomu", tags=["nomu"])

# 必须与 credit_price seed 和 llm_usage.source 词表一致
CREDIT_SOURCE = "nomu_prompt_optimize"


@router.post(
    "/prompt-optimize", response_model=APIResponse[PromptOptimizeResponse]
)
@limiter.limit("20/minute")
async def prompt_optimize(
    request: Request,
    payload: PromptOptimizeRequest,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
    user: int = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    state: AppState = Depends(get_app_state),
):
    """优化 NomuDesign 图生成提示词，返回 ``{prompt, usage}``。

    ``usage``（token 消耗）随 ``data`` 返回；``credits_spent`` 为本次实扣
    （分）。积分幂等键取 ``Idempotency-Key`` 头（缺省服务端 uuid4），经
    服务层记入 ``llm_usage`` 的 meta。
    """

    async def _run(biz_id: str):
        return await state.nomu_svc.optimize_prompt(
            payload.prompt,
            user_id=user,
            credit_biz_id=biz_id,
        )

    result, txn = await call_with_billing(
        session, user, CREDIT_SOURCE, idempotency_key, _run
    )

    return APIResponse(
        data=PromptOptimizeResponse(
            **result.model_dump(),
            credits_spent=-txn.amount / 100,  # 厘 → 分
        ),
        message="success",
    )
