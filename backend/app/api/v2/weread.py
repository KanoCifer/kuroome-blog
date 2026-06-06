from beanie import Link
from fastapi import APIRouter, Depends

from app.api.des.auth import manager
from app.api.des.des import weread_service_dep
from app.core.exceptions import APIError
from app.core.response import APIResponse
from app.models.weread import UserBook, WereadBook
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
    return APIResponse.ok(message="User information saved successfully")


@router.get("/bookshelf")
async def get_user_shelf(
    current_user=Depends(manager),
    weread_service=Depends(weread_service_dep),
):
    """获取用户书架信息"""
    try:
        user_books, archives = await weread_service.get_user_shelf(
            current_user.id
        )
    except ValueError:
        raise APIError(message="Invalid user ID") from None
    user_books_data = []
    for b in user_books:
        if b.bookInfo and isinstance(b.bookInfo, Link):
            try:
                await b.fetch_link(UserBook.bookInfo)
            except Exception:
                pass
        d = b.model_dump(mode="json", exclude={"bookInfo"})
        if b.bookInfo and isinstance(b.bookInfo, WereadBook):
            d["title"] = b.bookInfo.title
            d["author"] = b.bookInfo.author
        else:
            d["title"] = ""
            d["author"] = ""
        user_books_data.append(d)

    return APIResponse.ok(
        data={
            "user_books": user_books_data,
            "archives": [a.model_dump(mode="json") for a in archives],
        },
        message="User bookshelf information retrieved successfully",
    )


@router.get("/book/{bookId}")
async def get_book_info(
    bookId: str,  # noqa: N803
    weread_service=Depends(weread_service_dep),
):
    """获取书籍信息"""
    try:
        book = await weread_service.get_book_info(bookId)
    except ValueError:
        raise APIError(message="Invalid book ID") from None
    return APIResponse.ok(
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
        count = await weread_service.sync_my_books(current_user.id, force=force)
    except ValueError:
        raise APIError(message="Invalid user ID") from None
    return APIResponse.ok(
        data={"imported_count": count},
        message=f"Successfully imported {count} books from WeRead",
    )


@router.get("/read-progress")
async def get_read_progress(
    user=Depends(manager),
    weread_service=Depends(weread_service_dep),
    refresh: bool = False,
):
    """获取阅读进度
    优先返回 Redis 缓存，缓存为空时自动拉取远端；
    ?refresh=true 跳过缓存直接拉取远端。
    """
    snapshots = await weread_service.orchestra_read_detail(
        user.id, force_refresh=refresh
    )
    return APIResponse.ok(
        data={"snapshots": [s.model_dump(mode="json") for s in snapshots]},
        message="Read progress retrieved successfully",
    )
