from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from fastapi import APIRouter, Depends, Query

if TYPE_CHECKING:
    from app.models.models import User

from app.api.des.auth import manager
from app.api.des.des import weread_service_dep
from app.core.exceptions import APIError
from app.core.response import APIResponse
from app.plugins.cache import redis_cache
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
    except ValueError:
        raise APIError(message="Invalid API key") from None
    return APIResponse(message="User information saved successfully")


@router.get("/bookshelf")
@redis_cache(exclude=["weread_service"])
async def get_user_shelf(
    current_user: User = Depends(manager),
    weread_service=Depends(weread_service_dep),
):
    """获取用户书架信息"""
    try:
        user_books_data, archives_data = await weread_service.get_user_shelf(
            current_user.id
        )
    except ValueError:
        raise APIError(message="Invalid user ID") from None

    return APIResponse(
        data={
            "user_books": user_books_data,
            "archives": archives_data,
        },
        message="User bookshelf information retrieved successfully",
    )


@router.get("/book/{bookId}")
async def get_book_info(
    bookId: str,
    weread_service=Depends(weread_service_dep),
):
    """获取书籍信息"""
    try:
        book = await weread_service.get_book_info(bookId)
    except ValueError:
        raise APIError(message="Invalid book ID") from None
    return APIResponse(
        data=book.model_dump(mode="json", by_alias=True),
        message="Book information retrieved successfully",
    )


@router.get("/sync-my-books")
async def sync_my_books(
    current_user=Depends(manager),
    weread_service=Depends(weread_service_dep),
    force: bool = False,
):
    """从远端同步我的书籍，force=true 时强制重新拉取所有书籍详情"""
    try:
        count = await weread_service.sync_my_books(
            current_user.id, force=force
        )
    except ValueError:
        raise APIError(message="Invalid user ID") from None
    return APIResponse(
        data={"imported_count": count},
        message=f"Successfully imported {count} books from WeRead",
    )


@router.get("/read-progress")
@redis_cache(ttl=300)
async def get_read_progress(
    mode: Literal["weekly", "monthly", "annually", "overall"] = Query(...),
    baseTime: int | None = Query(
        None,
        description="目标周期的 unix 秒。缺省 = 当前周期；overall 模式忽略此参数。",
    ),
    user=Depends(manager),
    weread_service=Depends(weread_service_dep),
):
    """获取指定 mode + 周期的阅读统计快照。

    - 不再保存任何快照，每次按需直拉远端
    - 接口级缓存 300s，key 含 (user, mode, baseTime)
    """
    snapshot = await weread_service.orchestra_read_detail(
        user.id, mode=mode, base_time=baseTime
    )
    return APIResponse(
        data=snapshot.model_dump(mode="json"),
        message="Read progress retrieved successfully",
    )


@router.get("/books-recommend")
@redis_cache(ttl=300)
async def get_books_recommend(
    user=Depends(manager),
    weread_service=Depends(weread_service_dep),
    count: int = Query(12),
    maxIdx: int = Query(0),
):
    """获取推荐阅读的书籍"""
    books = await weread_service.fetch_books_recommend(
        user.id, count=count, maxIdx=maxIdx
    )
    return APIResponse(
        data=[book.model_dump(mode="json") for book in books],
        message="Books recommend retrieved successfully",
    )
