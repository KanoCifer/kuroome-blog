from __future__ import annotations

from datetime import UTC, datetime

from bson import ObjectId
from flask import (
    current_app,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_babel import gettext as _
from flask_login import current_user
from markupsafe import Markup
from sqlalchemy import select

from legacy.forms import AdminCommentForm, CommentForm
from watchlist.blog import blog_bp
from watchlist.extensions import cache, db, mongo
from watchlist.models import Category


class MongoPagination:
    """SQLAlchemy-style pagination wrapper for MongoDB queries."""

    def __init__(
        self,
        items: list,
        total: int,
        page: int,
        per_page: int,
    ):
        self.items = items
        self.total = total
        self.page = page
        self.per_page = per_page
        self.pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        self.has_prev = page > 1
        self.has_next = page < self.pages
        self.prev_num = page - 1 if self.has_prev else None
        self.next_num = page + 1 if self.has_next else None


@blog_bp.route("/", defaults={"page": 1})
@blog_bp.route("/page/<int:page>")
@cache.cached(
    timeout=300,
    query_string=True,
    unless=lambda: current_user.is_authenticated,
)
def index(page: int = 1):
    per_page = current_app.config.get("POSTS_PER_PAGE", 10)

    if mongo.db is not None:
        total = mongo.db.posts.count_documents({})
        skip = (page - 1) * per_page
        posts = list(
            mongo.db.posts.find()
            .sort("created_at", -1)
            .skip(skip)
            .limit(per_page)
        )
        pagination = MongoPagination(posts, total, page, per_page)
    else:
        posts = []
        pagination = None

    categories = (
        db.session.execute(select(Category).order_by(Category.name))
        .scalars()
        .all()
    )
    cat_map = {c.id: c for c in categories}

    # Calculate post counts for each category
    category_counts = {}
    if mongo.db is not None:
        pipeline = [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]
        counts = mongo.db.posts.aggregate(pipeline)
        for count in counts:
            category_counts[count["_id"]] = count["count"]

    for cat in categories:
        cat.posts_count = category_counts.get(cat.id, 0)  # type: ignore

    for post in posts:
        post["body_html"] = Markup(post.get("body", ""))
        cat = cat_map.get(post.get("category_id"))
        post["category"] = cat

    return render_template(
        "blog/blog.html",
        pagination=pagination,
        posts=posts,
        categories=categories,
        category_counts=category_counts,
    )


@blog_bp.route("/category/<int:category_id>")
@blog_bp.route("/category/<int:category_id>/page/<int:page>")
@cache.cached(
    timeout=300,
    query_string=True,
    unless=lambda: current_user.is_authenticated,
)
def category(category_id, page: int = 1):
    """按类别显示文章列表"""
    cat = db.get_or_404(Category, category_id)
    per_page = current_app.config.get("POSTS_PER_PAGE", 10)

    if mongo.db is not None:
        query = {"category_id": category_id}
        total = mongo.db.posts.count_documents(query)
        skip = (page - 1) * per_page
        posts = list(
            mongo.db.posts.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(per_page)
        )
        pagination = MongoPagination(posts, total, page, per_page)
    else:
        posts = []
        pagination = None

    categories = (
        db.session.execute(select(Category).order_by(Category.name))
        .scalars()
        .all()
    )
    cat_map = {c.id: c for c in categories}

    # Calculate post counts for each category
    category_counts = {}
    if mongo.db is not None:
        pipeline = [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]
        counts = mongo.db.posts.aggregate(pipeline)
        for count in counts:
            category_counts[count["_id"]] = count["count"]

    for c in categories:
        c.posts_count = category_counts.get(c.id, 0)  # type: ignore

    for post in posts:
        post["body_html"] = Markup(post.get("body", ""))
        post["category"] = cat_map.get(post.get("category_id"))

    return render_template(
        "blog/blog.html",
        pagination=pagination,
        posts=posts,
        categories=categories,
        category_counts=category_counts,
        active_category=cat,
    )


@blog_bp.route("/post/<string:_id>", methods=["GET", "POST"])
def post(_id):
    """显示文章详情"""
    if mongo.db is None:
        return render_template("errors/404.html"), 404

    try:
        obj_id = ObjectId(_id)
    except Exception:
        return render_template("errors/404.html"), 404

    post = mongo.db.posts.find_one({"_id": obj_id})
    if post is None:
        return render_template("errors/404.html"), 404

    # 判断当前用户是否是管理员
    is_admin = current_user.is_authenticated and current_user.id == 1

    # 获取评论树结构
    raw_comments = post.get("comments", [])
    if not is_admin:
        raw_comments = [c for c in raw_comments if c.get("reviewed", False)]

    comment_map: dict = {}
    root_comments: list = []
    for comment in raw_comments:
        cid = str(comment.get("_id"))
        comment_map[cid] = {"comment": comment, "replies": []}
    for comment in raw_comments:
        cid = str(comment.get("_id"))
        replied_id = comment.get("replied_id")
        if replied_id and str(replied_id) in comment_map:
            comment_map[str(replied_id)]["replies"].append(comment_map[cid])
        else:
            root_comments.append(comment_map[cid])

    body_html = Markup(post.get("body", ""))

    if is_admin:
        form = AdminCommentForm()
        form.author.data = current_user.name
        from_admin = True
        reviewed = True
    else:
        form = CommentForm()
        form.author.data = "Anonymous"
        from_admin = False
        reviewed = False

    if form.validate_on_submit():
        replied_id_str = request.form.get("replied_id") or request.args.get(
            "replied_id"
        )
        replied_id = None

        if replied_id_str:
            try:
                replied_id = ObjectId(replied_id_str)
            except Exception:
                replied_id = None

            # 验证父评论是否存在
            parent = None
            for c in post.get("comments", []):
                if str(c.get("_id")) == replied_id_str:
                    parent = c
                    break
            if parent is None:
                flash(
                    _("The comment you are replying to does not exist."),
                    "error",
                )
                return redirect(request.path)

        # 添加评论到 MongoDB
        new_comment = {
            "_id": ObjectId(),
            "author": form.author.data or "",
            "email": form.email.data or "",
            "body": form.body.data or "",
            "site": form.site.data or "",
            "from_admin": from_admin,
            "reviewed": reviewed,
            "replied_id": replied_id,
            "created_at": datetime.now(UTC),
        }
        mongo.db.posts.update_one(
            {"_id": obj_id},
            {"$push": {"comments": new_comment}},
        )

        if from_admin:
            flash(_("Your comment has been published."))
        else:
            flash(_("Your comment has been submitted and is awaiting review."))
        return redirect(request.path)

    categories = (
        db.session.execute(select(Category).order_by(Category.name))
        .scalars()
        .all()
    )

    # Calculate post counts for each category
    category_counts = {}
    if mongo.db is not None:
        pipeline = [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]
        counts = mongo.db.posts.aggregate(pipeline)
        for count in counts:
            category_counts[count["_id"]] = count["count"]

    for cat in categories:
        cat.posts_count = category_counts.get(cat.id, 0)  # type: ignore

    return render_template(
        "blog/post.html",
        post=post,
        comments=root_comments,
        post_body=body_html,
        form=form,
        categories=categories,
        category_counts=category_counts,
    )


@blog_bp.route("/comment/<string:comment_id>/approve", methods=["POST"])
def approve_comment(comment_id):
    """Approve a comment (admin only)."""
    if not current_user.is_authenticated or not current_user.is_admin:
        flash(
            _("You don't have permission to perform this action."),
            "error",
        )
        return redirect(request.referrer or url_for("blog.index"))

    if mongo.db is None:
        flash(_("Database not available."), "error")
        return redirect(request.referrer or url_for("blog.index"))

    try:
        obj_id = ObjectId(comment_id)
    except Exception:
        flash(_("Invalid comment ID."), "error")
        return redirect(request.referrer or url_for("blog.index"))

    post = mongo.db.posts.find_one({"comments._id": obj_id})
    if post is None:
        flash(_("Comment not found."), "error")
        return redirect(request.referrer or url_for("blog.index"))

    mongo.db.posts.update_one(
        {"comments._id": obj_id},
        {"$set": {"comments.$.reviewed": True}},
    )

    flash(_("Comment has been approved."), "success")
    return redirect(
        request.referrer or url_for("blog.post", _id=str(post["_id"]))
    )


@blog_bp.route("/comment/<string:comment_id>/delete", methods=["POST"])
def delete_comment(comment_id):
    """Delete a comment (admin only)."""
    if not current_user.is_authenticated or not current_user.is_admin:
        flash(
            _("You don't have permission to perform this action."),
            "error",
        )
        return redirect(request.referrer or url_for("blog.index"))

    if mongo.db is None:
        flash(_("Database not available."), "error")
        return redirect(request.referrer or url_for("blog.index"))

    try:
        obj_id = ObjectId(comment_id)
    except Exception:
        flash(_("Invalid comment ID."), "error")
        return redirect(request.referrer or url_for("blog.index"))

    post = mongo.db.posts.find_one({"comments._id": obj_id})
    if post is None:
        flash(_("Comment not found."), "error")
        return redirect(request.referrer or url_for("blog.index"))

    mongo.db.posts.update_one(
        {"_id": post["_id"]},
        {"$pull": {"comments": {"_id": obj_id}}},
    )

    flash(_("Comment has been deleted."), "success")
    return redirect(
        request.referrer or url_for("blog.post", _id=str(post["_id"]))
    )
