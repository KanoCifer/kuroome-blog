from datetime import UTC, datetime

from flask_login import current_user

from watchlist.extensions import db
from watchlist.models import Book, UserBook


def import_books_from_weread(book_data):
    """从微信读书导入书籍数据"""
    imported_count = 0
    for item in book_data.get("books", []):
        data = item.get("book", {})
        bookid = data.get("bookId")

        book = db.session.execute(
            db.select(Book).filter_by(bookid=bookid)
        ).scalar()

        if not book:
            book = Book(
                title=data.get("title", "未知书名"),
                author=data.get("author", "未知作者"),
                bookid=bookid,
                cover=data.get("cover"),
            )
            db.session.add(book)
            db.session.flush()  # 获取 book.id

        # 检查该用户是否已经添加了这本书
        user_book = db.session.execute(
            db.select(UserBook).filter_by(
                user_id=current_user.id, book_id=book.id
            )
        ).scalar()

        if not user_book:
            user_book = UserBook(
                user_id=current_user.id,
                book_id=book.id,
                iscompleted=False,
                add_date=datetime.now(UTC),
            )
            db.session.add(user_book)
            imported_count += 1
    db.session.commit()
    return imported_count
