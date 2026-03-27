from app.tasks.broker import broker


@broker.task(task_name="import_books_from_weread")
async def import_books_from_weread(book_data: dict, user_id: int):
    """把解析后的微信读书数据写入数据库。

    Args:
        book_data: 微信读书 API 返回的书籍数据
        user_id: 用户 ID

    Returns:
        导入的书籍数量
    """
    from app.core.container import get_book_service

    async with get_book_service() as service:
        imported_count = await service.import_books_from_data(
            book_data=book_data, user_id=user_id
        )
    return imported_count
