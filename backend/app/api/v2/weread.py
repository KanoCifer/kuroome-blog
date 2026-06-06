from fastapi import APIRouter, Depends

from app.api.des.auth import manager
from app.api.des.des import weread_service_dep
from app.core.exceptions import APIError
from app.core.response import APIResponse
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
        raise APIError(message=str(exc))
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
    except ValueError as exc:
        raise APIError(message=str(exc))
    user_books_data = []
    for b in user_books:
        d = b.model_dump(mode="json")
        if b.book:
            d["title"] = b.book.title
            d["author"] = b.book.author
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
    except ValueError as exc:
        raise APIError(message=str(exc))
    return APIResponse.ok(
        data=book.model_dump(mode="json"),
        message="Book information retrieved successfully",
    )


@router.get("/sync-my-books")
async def sync_my_books(
    current_user=Depends(manager),
    weread_service=Depends(weread_service_dep),
):
    """从远端同步我的书籍"""
    try:
        count = await weread_service.sync_my_books(current_user.id)
    except ValueError as exc:
        raise APIError(message=str(exc))
    return APIResponse.ok(
        data={"imported_count": count},
        message=f"Successfully imported {count} books from WeRead",
    )
