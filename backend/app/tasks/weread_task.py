from datetime import UTC, datetime

from sqlalchemy import select

from app.api.des.db import get_session
from app.models.models import Book, UserBook
from app.tasks.broker import broker


@broker.task(task_name="import_books_from_weread")
async def import_books_from_weread(book_data: dict, user_id: int):
    """把解析后的微信读书数据写入数据库 (同步).

    在异步视图中应通过 `asyncio.to_thread` 调用本函数以避免阻塞事件循环。

    Args:
        book_data: 微信读书 API 返回的书籍数据
        user_id: 用户 ID

    Returns:
        导入的书籍数量
    """
    # Import models inside function to avoid circular imports
    async for db in get_session():
        imported_count = 0
        for item in book_data.get("books", []):
            data = item.get("book", {})
            bookid = data.get("bookId")

            result = await db.execute(select(Book).filter_by(bookid=bookid))
            book = result.scalar()

            if not book:
                book = Book(
                    title=data.get("title", "未知书名"),
                    author=data.get("author", "未知作者"),
                    bookid=bookid,
                    cover=data.get("cover"),
                )
                db.add(book)
                await db.flush()  # 获取 book.id

            # 检查该用户是否已经添加了这本书
            result = await db.execute(
                select(UserBook).filter_by(user_id=user_id, book_id=book.id)
            )
            user_book = result.scalar()

            if not user_book:
                user_book = UserBook(
                    user_id=user_id,
                    book_id=book.id,
                    iscompleted=False,
                    add_date=datetime.now(UTC),
                )
                db.add(user_book)
                imported_count += 1

        await db.commit()
        return imported_count
