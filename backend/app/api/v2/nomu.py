"""v2 nomu API — NomuDesign 配套 AI 能力（登录 / 匿名均可用，参考 translate 路由）。

限流：``@limiter.limit`` 按 IP（``client_key``）计数，匿名用户同样命中；
超过阈值返回 429。
"""

from fastapi import APIRouter, Depends, Request

from app.api.des.auth import optional_user
from app.api.des.limiter import limiter
from app.appstate import AppState, get_app_state
from app.core.response import APIResponse
from app.schemas.nomu import PromptOptimizeRequest, PromptOptimizeResult
from app.services.nomu_service import NomuService

router = APIRouter(prefix="/nomu", tags=["nomu"])


@router.post(
    "/prompt-optimize", response_model=APIResponse[PromptOptimizeResult]
)
@limiter.limit("20/minute")
async def prompt_optimize(
    request: Request,
    payload: PromptOptimizeRequest,
    user: int | None = Depends(optional_user),
    state: AppState = Depends(get_app_state),
):
    """优化 NomuDesign 图生成提示词，返回 ``{prompt, usage}``。

    ``usage``（token 消耗）随 ``data`` 返回；匿名用户 ``user_id`` 为 None，
    落库时记为 NULL，不落 IP。
    """
    svc: NomuService = state.nomu_svc
    result = await svc.optimize_prompt(payload.prompt, user_id=user)
    return APIResponse(data=result, message="success")
