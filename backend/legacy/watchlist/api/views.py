"""API views for ReadingList application.

This module provides RESTful API endpoints for the reading list application.
All endpoints use JSON for request/response bodies unless otherwise specified.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from apiflask import PaginationSchema, Schema
from apiflask.fields import (
    Boolean,
    DateTime,
    File,
    Integer,
    List,
    Nested,
    String,
)
from flask import (
    current_app,
    request,
    send_from_directory,
)
from flask_login import current_user, login_required
from markupsafe import escape
from sqlalchemy import select
from werkzeug.utils import secure_filename

from watchlist.api import api
from watchlist.api.utils import APIResponse
from watchlist.extensions import cache, csrf, db, mongo
from watchlist.models import Book, Profile, User, UserBook

if TYPE_CHECKING:
    from flask import Response

# ============================================================================
# Public Endpoints (No authentication required)
# ============================================================================


@api.route("/status")
@cache.cached(timeout=60)
def status() -> tuple[Response, int]:
    """
    获取 API 状态

    Returns:
        APIResponse: 成功时返回 API 正常运行状态-失败时返回错误信息

    示例响应:
        {
            "status": "success",
            "message": "API is running",
            "data": {"status": "ok"}
        }
    """
    return APIResponse.api_response(
        data={"status": "ok"},
        message="API is running",
    )


@api.route("/robots.txt")
@cache.cached(timeout=3600)
def robots_txt() -> tuple[Response, int]:
    """
    返回 robots.txt 文件,告诉搜索引擎哪些页面可以抓取

    Returns:
        Response: robots.txt 文件内容
    """
    robots_content = """User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /
Allow: /blog/
Allow: /blog/*

Sitemap: https://readinglist.example.com/api/sitemap.xml
"""
    return current_app.response_class(
        robots_content, mimetype="text/plain"
    ), 200


@api.route("/sitemap.xml")
@cache.cached(timeout=3600)
def sitemap_xml() -> tuple[Response, int]:
    """
    生成并返回站点地图 XML-帮助搜索引擎更好地抓取网站

    Returns:
        Response: sitemap.xml 文件内容
    """
    from xml.etree.ElementTree import Element, SubElement, tostring

    urlset = Element(
        "urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    )

    # 首页
    url = SubElement(urlset, "url")
    loc = SubElement(url, "loc")
    loc.text = "https://readinglist.example.com"
    lastmod = SubElement(url, "lastmod")
    lastmod.text = datetime.now(UTC).isoformat().split("T")[0]
    changefreq = SubElement(url, "changefreq")
    changefreq.text = "daily"
    priority = SubElement(url, "priority")
    priority.text = "1.0"

    # 博客列表页
    url = SubElement(urlset, "url")
    loc = SubElement(url, "loc")
    loc.text = "https://readinglist.example.com/blog"
    lastmod = SubElement(url, "lastmod")
    lastmod.text = datetime.now(UTC).isoformat().split("T")[0]
    changefreq = SubElement(url, "changefreq")
    changefreq.text = "daily"
    priority = SubElement(url, "priority")
    priority.text = "0.9"

    # 博客文章页面
    if mongo.db is not None:
        posts = list(mongo.db.posts.find({}, {"_id": 1, "updated_at": 1}))
        for post in posts:
            url = SubElement(urlset, "url")
            loc = SubElement(url, "loc")
            loc.text = f"https://readinglist.example.com/blog/{post['_id']!s}"

            if "updated_at" in post:
                lastmod = SubElement(url, "lastmod")
                lastmod.text = post["updated_at"].isoformat().split("T")[0]

            changefreq = SubElement(url, "changefreq")
            changefreq.text = "weekly"
            priority = SubElement(url, "priority")
            priority.text = "0.8"

    # 关于页面
    url = SubElement(urlset, "url")
    loc = SubElement(url, "loc")
    loc.text = "https://readinglist.example.com/about"
    lastmod = SubElement(url, "lastmod")
    lastmod.text = datetime.now(UTC).isoformat().split("T")[0]
    changefreq = SubElement(url, "changefreq")
    changefreq.text = "monthly"
    priority = SubElement(url, "priority")
    priority.text = "0.7"

    # 联系页面
    url = SubElement(urlset, "url")
    loc = SubElement(url, "loc")
    loc.text = "https://readinglist.example.com/contact"
    lastmod = SubElement(url, "lastmod")
    lastmod.text = datetime.now(UTC).isoformat().split("T")[0]
    changefreq = SubElement(url, "changefreq")
    changefreq.text = "monthly"
    priority = SubElement(url, "priority")
    priority.text = "0.6"

    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(
        urlset, encoding="unicode"
    )

    return current_app.response_class(
        xml_content, mimetype="application/xml"
    ), 200


@api.route("/media/<path:filename>")
def media(filename: str) -> tuple[Response, int]:
    """获取媒体文件.

    Args:
        filename (str): 媒体文件路径

    Returns:
        APIResponse: 成功时返回媒体文件内容-失败时返回 404 错误

    Note:
        确保 MEDIA_PATH 配置正确且安全-防止目录遍历攻击.
    """
    response = send_from_directory(current_app.config["MEDIA_PATH"], filename)
    return response, 200


# ============================================================================
# Protected Endpoints (Authentication required)
# ============================================================================
class Image(Schema):
    image = File()


@api.route("/upload_pic", methods=["POST"])
@api.input(Image, location="files")
@login_required
def upload_pic(files_data) -> tuple[Response, int]:
    """
    上传用户头像

    需要包含 'image' 字段的 multipart/form-data 请求。

    表单数据:
        image (file): 要上传的图片文件

    返回值:
        包含上传文件名的 JSON 响应。

    示例响应成功:
        {
            "status": "success",
            "message": "Photo uploaded successfully",
            "data": {"filename": "a1b2c3d4e5f6.jpg"}
        }

    示例响应错误:
        {
            "status": "error",
            "message": "Invalid file",
            "data": {},
            "errors": {"photo": ["File type not allowed"]}
        }

    HTTP 状态码:
        200: 上传成功
        400: 验证错误
        401: 未认证
    """
    file = files_data["image"]

    filename = secure_filename(file.filename)

    if not filename.endswith((".jpg", ".jpeg", ".png")):
        return APIResponse.error_response(
            message="Invalid file type. Only JPEG and PNG are allowed.",
            code=400,
            errors={"image": ["File type not allowed"]},
        )

    suffix = (
        file.filename.rsplit(".", 1)[-1].lower()
        if "." in file.filename
        else ""
    )
    filename = f"{uuid.uuid4().hex}.{suffix}"

    media_path = current_app.config["MEDIA_PATH"]
    if not media_path.exists():
        media_path.mkdir(parents=True, exist_ok=True)

    file.save(media_path / filename)

    # Update user's profile photo
    if current_user.profile is None:
        current_user.profile = Profile(user_id=current_user.id)

    current_user.profile.photo = filename
    db.session.commit()

    return APIResponse.api_response(
        data={"filename": filename},
        message="Photo uploaded successfully",
    )


class BookQuery(Schema):
    page = Integer(load_default=1)
    per_page = Integer(load_default=20)
    sort_by = String(load_default="add_date")
    sort_order = String(load_default="desc")


class BookOut(Schema):
    id = Integer()
    title = String()
    author = String()
    bookid = String()
    cover = String()
    iscompleted = Boolean()
    add_date = DateTime()
    update_date = DateTime()


class BooksOut(Schema):
    books = List(Nested(BookOut))
    pagination = Nested(PaginationSchema)


class BookStatusIn(Schema):
    iscompleted = Boolean(required=True)


@api.route("/book")
@login_required
@cache.cached(
    timeout=60,
    make_cache_key=lambda *args, **kwargs: (
        f"books:{current_user.get_id()}:{request.full_path}"
    ),
)
@api.input(BookQuery, location="query")
def get_books(query_data) -> tuple[Response, int]:
    """Get user's books with pagination."""
    # Check database availability and user authentication
    if db.session is None:
        return APIResponse.error_response(
            message="Database is not available.",
            code=500,
        )
    if current_user.is_anonymous:
        return APIResponse.error_response(
            message="Authentication required.",
            code=401,
        )
    sort_field = query_data.get("sort_by", "add_date")
    sort_order = query_data.get("sort_order", "desc")

    sort_map = {
        "add_date": UserBook.add_date,
        "update_date": UserBook.update_date,
        "iscompleted": UserBook.iscompleted,
    }
    sort_column = sort_map.get(sort_field, UserBook.add_date)
    order_clause = (
        sort_column.asc()
        if str(sort_order).lower() == "asc"
        else sort_column.desc()
    )

    pagination = db.paginate(
        select(UserBook)
        .filter_by(user_id=current_user.id)
        .order_by(order_clause),
        page=query_data["page"],
        per_page=query_data["per_page"],
    )

    books = [
        {
            "id": user_book.book.id,
            "title": user_book.book.title,
            "author": user_book.book.author,
            "bookid": user_book.book.bookid,
            "cover": user_book.book.cover,
            "iscompleted": user_book.iscompleted,
            "add_date": user_book.add_date,
            "update_date": user_book.update_date,
        }
        for user_book in pagination.items
    ]

    return APIResponse.api_response(
        data={
            "books": books,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_prev": pagination.has_prev,
                "has_next": pagination.has_next,
                "prev_num": pagination.prev_num,
                "next_num": pagination.next_num,
            },
        },
        message="Books retrieved successfully",
    )


class AddBookIn(Schema):
    title = String(required=True)
    author = String(required=True)
    iscompleted = Boolean(load_default=False)


@api.route("/books/addbook", methods=["POST"])
@api.input(AddBookIn)
@login_required
def add_book(json_data) -> tuple[Response, int]:
    """Add a new book to user's collection."""
    # Implementation for adding a book goes here
    title = json_data["title"]
    author = json_data["author"]
    iscompleted = json_data.get("iscompleted", False)
    # Check if the book already exists in the database
    book = db.session.execute(
        select(Book).filter_by(title=title, author=author)
    ).scalar()

    if not book:
        # Create a new book entry
        book = Book(title=title, author=author)
        db.session.add(book)
        db.session.commit()
    # Check if the user already has this book in their collection
    user_book = db.session.execute(
        select(UserBook).filter_by(user_id=current_user.id, book_id=book.id)
    ).scalar()
    if user_book:
        return APIResponse.error_response(
            message="Book already exists in your collection",
            code=400,
        )
    # Add the book to the user's collection
    user_book = UserBook(
        user_id=current_user.id,
        book_id=book.id,
        iscompleted=iscompleted,
    )
    db.session.add(user_book)
    db.session.commit()

    cache.delete_memoized(get_books)

    return APIResponse.api_response(
        message="Book added to your collection successfully",
    )


@api.route("/books/<int:book_id>", methods=["DELETE"])
@login_required
def delete_book(book_id: int) -> tuple[Response, int]:
    """Delete a book from user's collection.

    Args:
        book_id: ID of the book to delete

    Returns:
        JSON response indicating success or failure.

    Example Response (Success):
        {
            "status": "success",
            "message": "Book deleted successfully",
            "data": {}
        }

    Example Response (Error - Not Found):
        {
            "status": "error",
            "message": "Book not found in your collection",
            "data": {}
        }

    HTTP Codes:
        200: Successfully deleted
        401: Not authenticated
        404: Book not found in user's collection
    """
    user_book = db.session.execute(
        select(UserBook).filter_by(user_id=current_user.id, book_id=book_id)
    ).scalar()

    if not user_book:
        return APIResponse.error_response(
            message="Book not found in your collection",
            code=404,
        )

    db.session.delete(user_book)
    db.session.commit()

    cache.delete_memoized(get_books)

    return APIResponse.api_response(
        message="Book deleted successfully",
    )


@api.route("/books/<int:book_id>/status", methods=["PATCH"])
@login_required
@api.input(BookStatusIn)
def update_book_status(book_id: int, json_data) -> tuple[Response, int]:
    """Update completion status of a book in user's collection."""
    user_book = db.session.execute(
        select(UserBook).filter_by(user_id=current_user.id, book_id=book_id)
    ).scalar()

    if not user_book:
        return APIResponse.error_response(
            message="Book not found in your collection",
            code=404,
        )

    user_book.iscompleted = json_data["iscompleted"]
    db.session.commit()

    cache.delete_memoized(get_books)

    return APIResponse.api_response(
        data={"book_id": book_id, "iscompleted": user_book.iscompleted},
        message="Book status updated successfully",
    )


# ============================================================================
# Message Board Endpoints
# ============================================================================


class MessageIn(Schema):
    name = String(required=True, validate=lambda x: 1 <= len(x) <= 20)
    message = String(required=True, validate=lambda x: 1 <= len(x) <= 500)


class MessageOut(Schema):
    id = String()
    name = String()
    message = String()
    created_at = DateTime()
    from_admin = Boolean()


class MessagesOut(Schema):
    messages = List(Nested(MessageOut))


@api.get("/messages")
@cache.memoize(timeout=60)
@csrf.exempt
def get_messages() -> tuple[Response, int]:
    """Get approved messages from message board."""
    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )

    messages = list(
        mongo.db.message_board.find({"review": 1}).sort("created_at", -1)
    )

    messages_list = []
    for msg in messages:
        messages_list.append(
            {
                "id": str(msg["_id"]),
                "name": msg["name"],
                "message": msg["message"],
                "created_at": msg["created_at"].isoformat()
                if msg.get("created_at")
                else None,
                "from_admin": msg.get("from_admin", False),
            }
        )

    return APIResponse.api_response(
        data={"messages": messages_list},
        message="Messages retrieved successfully",
    )


@api.post("/messages")
@api.input(MessageIn)
@csrf.exempt
def create_message(json_data) -> tuple[Response, int]:
    """Submit a new message to message board (pending review)."""
    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )
    # Server-side sanitize: convert any markup to escaped plain-text to prevent XSS
    name = str(escape(json_data["name"].strip()))
    message = str(escape(json_data["message"].strip()))

    is_admin = current_user.is_authenticated and current_user.is_admin

    message_entry = {
        "name": name,
        "message": message,
        "created_at": datetime.now(UTC),
        "review": 0,  # 0 = pending review, 1 = approved
        "from_admin": is_admin,
    }

    result = mongo.db.message_board.insert_one(message_entry)

    cache.delete_memoized(get_messages)

    return APIResponse.api_response(
        data={"id": str(result.inserted_id)},
        message="Message submitted successfully, pending review",
    )


# =============================================================================
# Message Board Admin APIs
# =============================================================================
# These endpoints require admin privileges (user ID = 1)


class AdminMessageOut(Schema):
    id = String()
    name = String()
    message = String()
    created_at = DateTime()
    review = Integer()  # 0 = pending, 1 = approved


class AdminMessagesOut(Schema):
    pending = List(Nested(AdminMessageOut))
    approved = List(Nested(AdminMessageOut))


@api.route("/admin/messages", methods=["GET"])
@login_required
@cache.cached(
    timeout=30,
    make_cache_key=lambda *args, **kwargs: (
        f"admin_messages:{current_user.get_id()}"
    ),
)
@csrf.exempt
def get_admin_messages() -> tuple[Response, int]:
    """Get all messages (pending and approved) for admin review.

    Requires admin privileges (user ID = 1).
    """
    if current_user.id != 1:
        return APIResponse.error_response(
            message="You don't have permission to access this resource.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )

    # Get pending messages (review = 0)
    pending_messages = list(
        mongo.db.message_board.find({"review": 0}).sort("created_at", -1)
    )

    # Get approved messages (review = 1), limit to 50
    approved_messages = list(
        mongo.db.message_board.find({"review": 1})
        .sort("created_at", -1)
        .limit(50)
    )

    def format_message(msg: dict) -> dict:
        return {
            "id": str(msg["_id"]),
            "name": msg["name"],
            "message": msg["message"],
            "created_at": msg["created_at"].isoformat()
            if msg.get("created_at")
            else None,
            "review": msg.get("review", 0),
        }

    return APIResponse.api_response(
        data={
            "pending": [format_message(msg) for msg in pending_messages],
            "approved": [format_message(msg) for msg in approved_messages],
        },
        message="Messages retrieved successfully",
    )


@api.route("/admin/messages/<message_id>/approve", methods=["POST"])
@login_required
@csrf.exempt
def approve_message(message_id: str) -> tuple[Response, int]:
    """Approve a pending message.

    Requires admin privileges (user ID = 1).
    """
    if current_user.id != 1:
        return APIResponse.error_response(
            message="You don't have permission to perform this action.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )

    try:
        from bson import ObjectId

        obj_id = ObjectId(message_id)
    except Exception:
        return APIResponse.error_response(
            message="Invalid message ID.",
            code=400,
        )

    result = mongo.db.message_board.update_one(
        {"_id": obj_id}, {"$set": {"review": 1}}
    )

    if result.modified_count > 0:
        cache.delete_memoized(get_messages)
        return APIResponse.api_response(
            message="Message has been approved.",
        )
    else:
        return APIResponse.error_response(
            message="Message not found or already approved.",
            code=404,
        )


@api.route("/admin/messages/<message_id>/delete", methods=["DELETE"])
@login_required
@csrf.exempt
def delete_message(message_id: str) -> tuple[Response, int]:
    """Delete a message.

    Requires admin privileges (user ID = 1).
    """
    if current_user.id != 1:
        return APIResponse.error_response(
            message="You don't have permission to perform this action.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )

    try:
        from bson import ObjectId

        obj_id = ObjectId(message_id)
    except Exception:
        return APIResponse.error_response(
            message="Invalid message ID.",
            code=400,
        )

    result = mongo.db.message_board.delete_one({"_id": obj_id})

    if result.deleted_count > 0:
        cache.delete_memoized(get_messages)
        return APIResponse.api_response(
            message="Message has been deleted.",
        )
    else:
        return APIResponse.error_response(
            message="Message not found.",
            code=404,
        )


# ============================================================================
# User Settings Endpoints
# ============================================================================


class UserSettingsIn(Schema):
    """Input schema for updating user settings."""

    name = String(required=True, validate=lambda x: len(x) <= 20)
    username = String(required=True, validate=lambda x: len(x) <= 20)
    gender = String(required=False, allow_none=True)
    email = String(required=False, allow_none=True)
    mobile = String(required=False, allow_none=True)
    password = String(required=False, allow_none=True)


class UserSettingsOut(Schema):
    """Output schema for user settings response."""

    id = Integer()
    name = String()
    username = String()
    gender = String()
    email = String()
    mobile = String()
    photo = String()
    message = String()


@api.route("/user/settings", methods=["PUT"])
@api.input(UserSettingsIn)
@api.output(UserSettingsOut, status_code=200)
@login_required
@csrf.exempt
def update_user_settings(json_data: dict) -> tuple[Response, int]:
    """Update current user's profile settings.

    Updates user info including name, username, email, mobile, gender,
    and optionally password. Requires authentication.
    """
    user = db.session.get(User, current_user.id)
    if user is None:
        return APIResponse.error_response(message="User not found.", code=404)

    new_username = json_data["username"]
    if new_username != user.username:
        existing_user = db.session.execute(
            select(User).filter_by(username=new_username)
        ).scalar_one_or_none()
        if existing_user is not None:
            return APIResponse.error_response(
                message="Username already exists.",
                code=400,
            )

    user.name = json_data["name"]
    user.username = new_username

    password = json_data.get("password")
    if password:
        user.set_password(password)

    profile = db.session.execute(
        select(Profile).filter_by(user_id=user.id)
    ).scalar_one_or_none()

    if profile is None:
        profile = Profile(user_id=user.id)
        db.session.add(profile)

    profile.gender = json_data.get("gender")
    profile.email = json_data.get("email")
    profile.mobile = json_data.get("mobile")

    db.session.commit()

    return APIResponse.api_response(
        data={
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "gender": profile.gender,
            "email": profile.email,
            "mobile": profile.mobile,
            "photo": profile.photo,
        },
        message="Profile updated successfully.",
    )
