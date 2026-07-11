from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.api.des.appstate import get_app_state
from app.api.des.auth import manager
from app.appstate import AppState
from app.core.exceptions import APIError
from app.core.logger import logger
from app.core.response import APIResponse
from app.plugins.cache import redis_cache
from app.schemas.weread import SaveUserInfoIn

router = APIRouter(prefix="/weread", tags=["weread"])


@router.post("/user-info")
async def save_user_info(
    data: SaveUserInfoIn,
    current_user: int = Depends(manager),
    state: AppState = Depends(get_app_state),
):
    """保存微信读书用户信息"""
    try:
        await state.weread_svc.save_user_info(current_user, data.api_key)
    except ValueError:
        raise APIError(message="Invalid API key") from None
    return APIResponse(message="User information saved successfully")


@router.get("/bookshelf")
@redis_cache(ttl=60, exclude=["state"])
async def get_user_shelf(
    current_user: int = Depends(manager),
    state: AppState = Depends(get_app_state),
):
    """获取用户书架信息（代理远端，60s 缓存）"""
    try:
        user_books_data, archives_data = await state.weread_svc.get_user_shelf(
            current_user
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
    current_user: int = Depends(manager),
    state: AppState = Depends(get_app_state),
):
    """获取书籍信息（本地优先，miss 时从远端拉取）"""
    try:
        book = await state.weread_svc.get_book_info(bookId, user_id=current_user)
    except ValueError:
        raise APIError(message="Invalid book ID") from None
    return APIResponse(
        data=book.model_dump(mode="json", by_alias=True),
        message="Book information retrieved successfully",
    )


@router.get("/book/{bookId}/progress")
async def get_book_progress(
    bookId: str,
    current_user: int = Depends(manager),
    state: AppState = Depends(get_app_state),
    refresh: bool = Query(
        False,
        description="true 时强制从远端 weRead 刷新;false 时本地优先,本地空时首次拉取。",
    ),
):
    """获取单本书阅读进度。

    - refresh=false: 本地 Mongo 优先,本地空时触发首次远端拉取
    - refresh=true: 直接强制远端刷新(写回本地)
    """
    try:
        if refresh:
            data = await state.weread_svc.refresh_book_progress(
                bookId, current_user
            )
        else:
            data = await state.weread_svc.get_book_progress(
                bookId, current_user
            )
            if data is None:  # 本地空 → 首次拉
                data = await state.weread_svc.refresh_book_progress(
                    bookId, current_user
                )
    except ValueError as e:
        logger.error(f"获取阅读进度失败: {e}")
        raise APIError(message="获取阅读进度失败") from e
    return APIResponse(
        data=data,
        message="Book progress retrieved successfully",
    )


@router.get("/sync-my-books")
async def sync_my_books(
    current_user: int = Depends(manager),
    state: AppState = Depends(get_app_state),
):
    """从远端同步我的书籍（仅持久化书架数据，详情按需获取）"""
    try:
        count = await state.weread_svc.sync_my_books(
            current_user
        )
    except ValueError:
        raise APIError(message="Invalid user ID") from None
    return APIResponse(
        data={"imported_count": count},
        message=f"Successfully imported {count} books from WeRead",
    )


@router.get("/read-progress")
@redis_cache(ttl=300, exclude=["state"])
async def get_read_progress(
    mode: Literal["weekly", "monthly", "annually", "overall"] = Query(...),
    baseTime: int | None = Query(
        None,
        description="目标周期的 unix 秒。缺省 = 当前周期；overall 模式忽略此参数。",
    ),
    perDay: bool = Query(False, description="按日拉取,用于年视图热力图"),
    year: int | None = Query(None, description="查询的年份,缺省为当前年份"),
    current_user: int = Depends(manager),
    state: AppState = Depends(get_app_state),
):
    """获取指定 mode + 周期的阅读统计快照。

    - 不再保存任何快照,每次按需直拉远端
    - 接口级缓存 300s,key 含 (user, mode, baseTime, perDay, year)
    - perDay=True 时走日级热力图分支:并发拉 12 个月合并每日 readTimes
    """
    if perDay:
        read_times: dict[str, int] = await state.weread_svc.fetch_yearly_heatmap(
            current_user, year=year
        )
        return APIResponse(
            data={"readTimes": read_times},
            message="Read times retrieved successfully",
        )
    snapshot = await state.weread_svc.orchestra_read_detail(
        current_user, mode=mode, base_time=baseTime
    )
    return APIResponse(
        data=snapshot.model_dump(mode="json"),
        message="Read progress retrieved successfully",
    )


@router.get("/books-recommend")
@redis_cache(ttl=300, exclude=["state", "user"])
async def get_books_recommend(
    user: int = Depends(manager),
    state: AppState = Depends(get_app_state),
    count: int = Query(12),
    maxIdx: int = Query(0),
):
    """获取推荐阅读的书籍"""
    books = await state.weread_svc.fetch_books_recommend(
        user, count=count, maxIdx=maxIdx
    )
    return APIResponse(
        data=[book.model_dump(mode="json") for book in books],
        message="Books recommend retrieved successfully",
    )
