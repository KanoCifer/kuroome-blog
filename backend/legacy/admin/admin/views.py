from datetime import UTC, datetime

from bson import ObjectId
from flask import flash, redirect, render_template, request, url_for
from flask_babel import gettext as _
from flask_login import current_user, login_required
from sqlalchemy import select

from legacy.forms import PostForm
from watchlist.admin import admin_bp
from watchlist.extensions import db, mongo
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


@admin_bp.route("/dashboard")
@login_required
def dashboard():
    return "Welcome to the Admin Dashboard"


@admin_bp.route("/manage_post")
@admin_bp.route("/manage_post/page/<int:page>")
@login_required
def manage_post(page: int = 1):
    """管理文章列表"""
    per_page = 10

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

    return render_template(
        "admin/manage_post.html",
        posts=posts,
        pagination=pagination,
    )


@admin_bp.route("/edit_post/<string:_id>", methods=["GET", "POST"])
@login_required
def edit_post(_id):
    form = PostForm()
    categories = (
        db.session.execute(select(Category).order_by(Category.name))
        .scalars()
        .all()
    )
    form.category.choices = [(c.id, c.name) for c in categories]

    if mongo.db is None:
        return render_template("errors/404.html"), 404

    try:
        obj_id = ObjectId(_id)
    except Exception:
        return render_template("errors/404.html"), 404

    post = mongo.db.posts.find_one({"_id": obj_id})
    if post is None:
        return render_template("errors/404.html"), 404

    if form.validate_on_submit():
        data = {
            "title": form.title.data or "",
            "body": form.body.data or "",
            "category_id": form.category.data,
            "updated_at": datetime.now(UTC),
        }
        mongo.db.posts.update_one({"_id": obj_id}, {"$set": data})
        flash(_("Post updated successfully!"))
        return redirect(url_for("blog.post", _id=_id))

    if request.method == "GET":
        form.title.data = post.get("title", "")
        form.body.data = post.get("body", "")
        form.category.data = post.get("category_id")

    return render_template("admin/edit_post.html", post=post, form=form)


@admin_bp.route("/newpost", methods=["GET", "POST"])
@login_required
def new_post():
    form = PostForm()
    categories = (
        db.session.execute(select(Category).order_by(Category.name))
        .scalars()
        .all()
    )
    form.category.choices = [(c.id, c.name) for c in categories]

    if form.validate_on_submit():
        if mongo.db is None:
            flash(_("MongoDB is not available."), "error")
            return redirect(url_for("admin.new_post"))
        try:
            data = {
                "title": form.title.data or "",
                "body": form.body.data or "",
                "category_id": form.category.data,
                "author_id": current_user.id,
                "comments": [],
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
            mongo.db.posts.insert_one(data)
            flash(_("New post created successfully!"))
            return redirect(url_for("blog.index"))
        except Exception as e:
            flash(_(f"Error creating post: {e}"), "error")
            return redirect(url_for("admin.new_post"))

    return render_template("admin/new_post.html", form=form)


@admin_bp.route("/delete_post/<string:_id>", methods=["POST"])
@login_required
def delete_post_view(_id):
    """删除文章"""
    if mongo.db is None:
        flash(_("MongoDB is not available."), "error")
        return redirect(url_for("admin.manage_post"))

    try:
        obj_id = ObjectId(_id)
    except Exception:
        flash(_("Invalid post ID."), "error")
        return redirect(url_for("admin.manage_post"))

    mongo.db.posts.delete_one({"_id": obj_id})
    flash(_("Post deleted successfully!"))
    return redirect(url_for("admin.manage_post"))
