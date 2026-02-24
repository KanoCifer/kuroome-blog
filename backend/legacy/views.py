import uuid
from datetime import UTC, datetime

import requests as pyrequests
from flask import (
    Blueprint,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_babel import gettext as _
from flask_login import current_user, login_required
from sqlalchemy import select

from legacy.forms import (
    BookForm,
    DeleteForm,
    ImportBooksForm,
    MessageBoardForm,
    SettingsForm,
    UploadPhotoForm,
)
from watchlist.extensions import cache, db, mongo
from watchlist.import_book import import_books_from_weread
from watchlist.models import Book, Profile, User, UserBook

# 主蓝图（BluePrint），用于处理主页相关的路由
main_bp = Blueprint("main", __name__)


@main_bp.route("/", methods=["GET", "POST"])
@main_bp.route("/index", methods=["GET", "POST"])
@cache.cached(timeout=60, unless=lambda: current_user.is_authenticated)
def index():
    """主页路由 - 显示书籍列表并处理新书添加"""
    form = BookForm()
    delete_form = DeleteForm()
    message_board_form = MessageBoardForm()
    # 处理表单提交 - 添加新书
    if form.validate_on_submit():
        if not current_user.is_authenticated:
            flash(_("You must log in first."))
            return redirect(url_for("main.index"))

        # 清理并格式化书名和作者
        title = (form.title.data or "").strip().title()
        author = (form.author.data or "").strip()
        iscompleted = form.iscompleted.data

        # 添加书籍完成状态
        user_book = db.session.execute(
            select(UserBook).filter_by(user_id=current_user.id)
        ).scalar()
        if user_book:
            user_book.iscompleted = iscompleted
            db.session.add(user_book)

        book = Book(title=title, author=author, bookid=None, cover=None)
        db.session.add(book)
        db.session.flush()
        user_book = UserBook(
            user_id=current_user.id, book_id=book.id, iscompleted=iscompleted
        )
        db.session.add(user_book)
        db.session.commit()
        flash(_("Item created."))
        return redirect(url_for("main.index"))

    # 获取当前用户的所有书籍（按完成状态和添加时间排序）
    if current_user.is_authenticated:
        user_obj = db.session.get(User, current_user.id)
        user_books = (
            sorted(
                user_obj.user_book,
                key=lambda ub: (
                    ub.iscompleted,
                    -(ub.add_date.timestamp() if ub.add_date else 0),
                ),
            )[:20]
            if user_obj
            else []
        )
    else:
        user_books = []

    # 获取管理员（ID=1）的书籍作为展示
    owner = db.session.get(User, 1)
    owner_books = (
        sorted(
            owner.user_book,
            key=lambda ub: (
                ub.iscompleted,
                -(ub.add_date.timestamp() if ub.add_date else 0),
            ),
        )[:20]
        if owner
        else []
    )
    # 显示留言板内容
    messages = []
    if mongo is not None and mongo.db is not None:
        messages = list(
            mongo.db.message_board.find({"review": 1})
            .sort("created_at", -1)
            .limit(20)
        )

    # 预填充留言板用户名
    if request.method == "GET":
        message_board_form.name.data = (
            current_user.name if current_user.is_authenticated else "Anonymous"
        )
    # 处理留言板表单提交
    if message_board_form.validate_on_submit():
        name = (
            message_board_form.name.data
            if message_board_form.name.data
            and message_board_form.name.data.strip() != ""
            else "Anonymous"
        )
        message = message_board_form.message.data
        if not message or message.strip() == "":
            flash(_("Message cannot be empty."))
        else:
            message_entry = {
                "name": name,
                "message": message,
                "created_at": datetime.now(UTC),
                "review": 0,  # 默认未审核
            }
            if mongo is None or mongo.db is None:
                flash(_("Message board is not available."))
            else:
                mongo.db.message_board.insert_one(message_entry)
            flash(_("Message posted and pending review."))
        return redirect(url_for("main.index"))

    return render_template(
        "main/index.html",
        user_books=user_books,
        owner_books=owner_books,
        form=form,
        delete_form=delete_form,
        message_board_form=message_board_form,
        messages=messages,
    )


@main_bp.route("/book/edit/<int:book_id>", methods=["GET", "POST"])
@login_required
def edit(book_id):
    """编辑书籍信息 - 需要登录权限"""
    # 根据ID获取书籍，如果不存在则返回404
    book = db.get_or_404(Book, book_id)
    form = BookForm()

    # 获取当前用户与该书籍的关联记录
    user_book = db.session.execute(
        select(UserBook).filter_by(user_id=current_user.id, book_id=book.id)
    ).scalar()

    # 处理表单提交 - 更新书籍信息
    if form.validate_on_submit():
        title = (form.title.data or "").strip().title()
        author = (form.author.data or "").strip()
        iscompleted = form.iscompleted.data

        # 更新关联的UserBook记录的完成状态
        if user_book:
            user_book.iscompleted = iscompleted
            db.session.add(user_book)

        # 更新书籍信息并提交到数据库
        book.title = title
        book.author = author
        db.session.add(book)

        db.session.commit()
        flash(_("Item updated."))
        return redirect(url_for("main.index"))

    # 仅在 GET 请求时预填充表单，防止覆盖用户提交的数据
    if request.method == "GET":
        form.title.data = book.title
        form.author.data = book.author
        if user_book:
            form.iscompleted.data = user_book.iscompleted

    return render_template("main/edit.html", book=book, form=form)


@main_bp.route("/book/delete/<int:book_id>", methods=["POST"])
@login_required
def delete(book_id):
    """删除书籍 - 需要登录权限"""
    form = DeleteForm()
    if form.validate_on_submit():
        # 根据ID获取书籍，如果不存在则返回404
        book = db.get_or_404(Book, book_id)
        # 从数据库中删除书籍
        user_book = db.session.execute(
            select(UserBook).filter_by(
                user_id=current_user.id, book_id=book.id
            )
        ).scalar()
        if user_book:
            db.session.delete(user_book)
        db.session.commit()
        flash(_("Item deleted."))
    else:
        flash(_("Invalid delete request."))
    return redirect(url_for("main.index"))


@main_bp.route("/book/toggle/<int:book_id>", methods=["POST"])
@login_required
def toggle_completion(book_id):
    """切换书籍完成状态 - 需要登录权限"""
    book = db.get_or_404(Book, book_id)
    user_book = db.session.execute(
        select(UserBook).filter_by(user_id=current_user.id, book_id=book.id)
    ).scalar()

    if user_book:
        user_book.iscompleted = not user_book.iscompleted
        db.session.add(user_book)
        db.session.commit()
        status = _("completed") if user_book.iscompleted else _("reading")
        flash(_("Book marked as %(status)s.", status=status))

    return redirect(url_for("main.index"))


@main_bp.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    """用户设置页面 - 需要登录权限,可更新个人信息和密码"""
    form = SettingsForm()
    photo_form = UploadPhotoForm()
    # 处理表单提交 - 更新用户信息
    if form.validate_on_submit():
        name = form.name.data
        username = form.username.data
        password = form.password.data
        gender = form.gender.data
        email = form.email.data
        mobile = form.mobile.data

        current_user.name = name
        current_user.username = username
        # 如果用户没有Profile，创建一个新的
        if current_user.profile is None:
            current_user.profile = Profile(user_id=current_user.id)

        # 更新个人资料信息
        current_user.profile.gender = gender
        current_user.profile.email = email
        current_user.profile.mobile = mobile

        # 如果提供了新密码，则更新密码
        if password:
            current_user.set_password(password)

        db.session.commit()
        flash(_("Settings updated."))
        return redirect(url_for("main.index"))

    if request.method == "GET":
        # 预填充表单数据
        form.name.data = current_user.name
        form.username.data = current_user.username
        if current_user.profile:
            if current_user.profile.email is not None:
                form.email.data = current_user.profile.email
            if current_user.profile.mobile is not None:
                form.mobile.data = current_user.profile.mobile
            if current_user.profile.gender is not None:
                form.gender.data = current_user.profile.gender

    return render_template(
        "main/settings.html", form=form, photo_form=photo_form
    )


@main_bp.route("/upload_pic", methods=["POST"])
@login_required
def upload_pic():
    """上传图片接口 - 需要登录权限"""
    photo_form = UploadPhotoForm()
    if photo_form.validate_on_submit():
        # 处理图片上传逻辑
        photo = photo_form.photo.data
        suffix = (
            photo.filename.rsplit(".", 1)[-1].lower()
            if "." in photo.filename
            else ""
        )
        filename: str = f"{uuid.uuid4().hex}.{suffix}"

        media_path = current_app.config["MEDIA_PATH"]
        if not media_path.exists():
            media_path.mkdir(parents=True, exist_ok=True)

        photo.save(media_path / filename)

        if current_user.profile is None:
            current_user.profile = Profile(user_id=current_user.id)

        current_user.profile.photo = filename
        db.session.commit()
        return jsonify({"status": "success", "filename": filename})
    return jsonify({"status": "error", "errors": photo_form.errors})


@main_bp.route("/bookshelf")
@login_required
def bookshelf():
    pass
    """书架页面 - 需要登录权限(预留接口,待实现)"""
    return render_template("main/bookshelf.html")


@main_bp.route("/import", methods=["GET", "POST"])
@login_required
def import_books():
    """导入书籍页面 - 需要登录权限"""
    form = ImportBooksForm()
    # 预填充session内保存的数据
    if session.get("weread_cookie"):
        form.weread_cookie.data = session["weread_cookie"]
    if form.validate_on_submit():
        # 处理导入书籍
        cookie: str | None = form.weread_cookie.data
        if cookie:
            cookie.strip()
        session["weread_cookie"] = cookie
        # 在这里添加使用 weread_cookie 导入书籍的逻辑
        header = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Cookie": cookie,
        }
        # 调用微信读书API获取书籍数据
        try:
            api_url: str = "https://weread.qq.com/api/user/notebook"
            response = pyrequests.get(
                api_url,
                headers=header,
                timeout=15,
            )
            response.raise_for_status()
            book_data = response.json()
            imported_count = import_books_from_weread(book_data)
            flash(_(f"Successfully imported {imported_count} books."))
            return jsonify(
                {"status": "success", "imported_count": imported_count}
            )
        # 处理可能的请求异常
        except pyrequests.exceptions.ConnectionError:
            flash(
                _(
                    "Network unreachable. Please check server internet connection or proxy settings."
                )
            )
            return jsonify(
                {"status": "error", "message": "Network unreachable"}
            )
        except pyrequests.RequestException as e:
            flash(_(f"Failed to import books: {e}"))
            return jsonify({"status": "error", "message": str(e)})

    return render_template("main/import.html", form=form)


@main_bp.route("/set-language/<lang>")
def set_language(lang):
    """设置语言路由"""
    # 验证语言是否支持
    supported_languages = ["zh", "en"]
    if lang in supported_languages:
        session["lang"] = lang
        flash(_("Language switched to %(lang)s.", lang=lang))
    else:
        flash(_("Language %(lang)s is not supported.", lang=lang), "error")

    # 重定向回之前的页面，或者首页
    next_page = request.args.get("next") or url_for("main.index")
    return redirect(next_page)


@main_bp.route("/about")
@cache.cached(timeout=86400)
def about():
    """关于页面"""
    return render_template("main/about.html")


@main_bp.route("/admin/messages")
@login_required
def manage_messages():
    """管理员留言审核页面"""
    # 仅管理员可访问 (ID=1 为管理员)
    if current_user.id != 1:
        flash(_("You don't have permission to access this page."), "error")
        return redirect(url_for("main.index"))

    # 获取所有待审核和已审核的留言
    pending_messages = []
    approved_messages = []

    if mongo is not None and mongo.db is not None:
        # 待审核留言 (review=0)
        pending_messages = list(
            mongo.db.message_board.find({"review": 0}).sort("created_at", -1)
        )
        # 已审核留言 (review=1)
        approved_messages = list(
            mongo.db.message_board.find({"review": 1})
            .sort("created_at", -1)
            .limit(50)
        )

    return render_template(
        "admin/manage_messages.html",
        pending_messages=pending_messages,
        approved_messages=approved_messages,
    )


@main_bp.route("/admin/message/<message_id>/approve", methods=["POST"])
@login_required
def approve_message(message_id):
    """审核通过留言"""
    if current_user.id != 1:
        flash(_("You don't have permission to perform this action."), "error")
        return redirect(url_for("main.index"))

    if mongo is None or mongo.db is None:
        flash(_("Database not available."), "error")
        return redirect(url_for("main.index"))

    try:
        from bson import ObjectId

        obj_id = ObjectId(message_id)
    except Exception:
        flash(_("Invalid message ID."), "error")
        return redirect(url_for("main.manage_messages"))

    result = mongo.db.message_board.update_one(
        {"_id": obj_id}, {"$set": {"review": 1}}
    )

    if result.modified_count > 0:
        flash(_("Message has been approved."), "success")
    else:
        flash(_("Message not found or already approved."), "info")

    return redirect(url_for("main.manage_messages"))


@main_bp.route("/admin/message/<message_id>/delete", methods=["POST"])
@login_required
def delete_message(message_id):
    """删除留言"""
    if current_user.id != 1:
        flash(_("You don't have permission to perform this action."), "error")
        return redirect(url_for("main.index"))

    if mongo is None or mongo.db is None:
        flash(_("Database not available."), "error")
        return redirect(url_for("main.index"))

    try:
        from bson import ObjectId

        obj_id = ObjectId(message_id)
    except Exception:
        flash(_("Invalid message ID."), "error")
        return redirect(url_for("main.manage_messages"))

    result = mongo.db.message_board.delete_one({"_id": obj_id})

    if result.deleted_count > 0:
        flash(_("Message has been deleted."), "success")
    else:
        flash(_("Message not found."), "error")

    return redirect(url_for("main.manage_messages"))
