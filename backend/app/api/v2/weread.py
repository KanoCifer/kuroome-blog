from fastapi import APIRouter, Depends

from app.api.des.auth import manager
from app.api.des.des import weread_service_dep
from app.schemas.response import APIResponse
from app.schemas.weread import SaveUserInfoIn

router = APIRouter(prefix="/weread", tags=["weread"])


@router.post("/user-info")
async def save_user_info(
    data: SaveUserInfoIn,
    current_user=Depends(manager),
    weread_service=Depends(weread_service_dep),
):
    """保存微信读书用户信息"""
    try:
        await weread_service.save_user_info(current_user.id, data.api_key)
    except ValueError as exc:
        return APIResponse.error(message=str(exc))
    return APIResponse.ok(message="User information saved successfully")
