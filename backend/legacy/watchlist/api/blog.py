from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from bson import ObjectId
from bson.errors import InvalidId
from flask import current_app
from flask.typing import ResponseReturnValue
from flask_login import current_user, login_required
from markupsafe import escape
from sqlalchemy import select

from watchlist.api import api
from watchlist.api.utils import APIResponse
from watchlist.extensions import cache, csrf, db, mongo
from watchlist.models import Category

if TYPE_CHECKING:
    from flask import Response
import asyncio

from apiflask import Schema
from apiflask.fields import Integer, String


class BlogInSchema(Schema):
    page = Integer(load_default=1)


@api.route("/blogs")
@api.input(BlogInSchema, location="query")
@cache.memoize(timeout=300)
async def get_blogs(query_data) -> tuple[Response, int]:
    per_page = current_app.config.get("POSTS_PER_PAGE", 10)
    page = query_data.get("page")
    if mongo.db is None:
        return APIResponse.error_response(
            message="Blog database not available",
            code=503,
        )

    if page < 1:
        return APIResponse.error_response(
            message="Invalid page number",
            code=400,
        )

    total = mongo.db.posts.count_documents({})
    skip = (page - 1) * per_page
    # 这里的 posts 是 MongoDB 查询结果的列表，每个 post 是一个字典，包含了博客文章的字段，如 title、content、category_id、created_at 等
    posts = await asyncio.to_thread(
        lambda: list(
            mongo.db.posts.find()
            .sort([("is_pinned", -1), ("created_at", -1)])
            .skip(skip)
            .limit(per_page)
        )
    )
    # 将 MongoDB 的 ObjectId 转换为字符串，并将 datetime 对象转换为 ISO 格式的字符串，以便 JSON 序列化

    categories = (
        db.session.execute(select(Category).order_by(Category.name))
        .scalars()
        .all()
    )
    cat_map = {c.id: c for c in categories}

    # 将 category_id 替换为 category 对象，并添加 category 字段到每个 post 中
    for post in posts:
        post["_id"] = str(post["_id"])
        post["created_at"] = (
            post["created_at"].isoformat() if "created_at" in post else None
        )
        post["updated_at"] = (
            post["updated_at"].isoformat() if "updated_at" in post else None
        )
        cat = cat_map.get(post.get("category_id"))
        post["category"] = {"id": cat.id, "name": cat.name} if cat else None

    # 统计每个分类下的文章数量
    category_counts = {}
    counts = mongo.db.posts.aggregate(
        [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]
    )
    for count in counts:
        category_counts[count["_id"]] = count["count"]

    category_list = [
        {
            "id": category.id,
            "name": category.name,
            "posts_count": category_counts.get(category.id, 0),
        }
        for category in categories
    ]

    pages = (total + per_page - 1) // per_page if per_page > 0 else 0

    return APIResponse.api_response(
        data={
            "posts": posts,
            "categories": category_list,
            "category_counts": category_counts,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": pages,
                "has_prev": page > 1,
                "has_next": page < pages,
                "prev_num": page - 1 if page > 1 else None,
                "next_num": page + 1 if page < pages else None,
            },
        },
        message="Blogs retrieved successfully",
    )


"""
获取文章内容接口
"""


class BlogPostSchema(Schema):
    _id = String()


@api.get("/post")
@api.input(BlogPostSchema, location="query")
@cache.memoize(timeout=300)
def get_blog(query_data) -> ResponseReturnValue:
    post_id = query_data.get("_id")
    if not post_id:
        return APIResponse.error_response(
            message="Missing blog post ID",
            code=400,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="Blog database not available",
            code=503,
        )

    try:
        post = mongo.db.posts.find_one({"_id": ObjectId(post_id)})
    except InvalidId:
        return APIResponse.error_response(
            message="Invalid blog post ID",
            code=400,
        )

    if not post:
        return APIResponse.error_response(
            message="Blog post not found",
            code=404,
        )

    post["_id"] = str(post["_id"])
    post["created_at"] = (
        post["created_at"].isoformat() if "created_at" in post else None
    )
    post["updated_at"] = (
        post["updated_at"].isoformat() if "updated_at" in post else None
    )
    post["is_pinned"] = post.get("is_pinned", 0)

    category = db.session.execute(
        select(Category).where(Category.id == post.get("category_id"))
    ).scalar_one_or_none()
    post["category"] = (
        {"id": category.id, "name": category.name} if category else None
    )

    # 处理评论数据，确保返回的评论包含 replied_id 和 reply_to_author 字段，并构建嵌套结构
    if "comments" in post:
        reviewed_comments = []
        for comment in post["comments"]:
            if comment.get("reviewed", False):
                reviewed_comments.append(
                    {
                        "_id": str(comment["_id"]),
                        "author": comment.get("author", "Anonymous"),
                        "body": comment.get("body", ""),
                        "created_at": comment.get("created_at").isoformat()
                        if comment.get("created_at")
                        else None,
                        "reviewed": comment.get("reviewed", False),
                        "replied_id": str(comment["replied_id"])
                        if "replied_id" in comment
                        else None,
                        "reply_to_author": comment.get("reply_to_author", ""),
                        "comments": [],  # 初始化子评论数组
                    }
                )

        # 构建评论树结构
        comment_map = {
            comment["_id"]: comment for comment in reviewed_comments
        }
        comment_tree = []

        for comment in reviewed_comments:
            if comment["replied_id"] is None:
                # 顶级评论
                comment_tree.append(comment)
            else:
                # 子评论，添加到对应的父评论下
                parent_id = comment["replied_id"]
                if parent_id in comment_map:
                    comment_map[parent_id]["comments"].append(comment)

        post["comments"] = comment_tree

    return APIResponse.api_response(
        data=post,
        message="Blog post retrieved successfully",
    )


class BlogPostInSchema(Schema):
    title = String(required=True)
    body = String(required=True)
    category_id = Integer(required=True)
    is_pinned = Integer(load_default=0)


@api.post("/post/addpost")
@api.input(BlogPostInSchema)
@login_required
def add_post(json_data):
    if current_user.id != 1:
        return APIResponse.error_response(
            message="Admin access required.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="Blog database not available",
            code=503,
        )

    title = json_data.get("title")
    body = json_data.get("body")
    category_id = json_data.get("category_id")
    is_pinned = json_data.get("is_pinned", 0)
    category = db.session.execute(
        select(Category).where(Category.id == category_id)
    ).scalar_one_or_none()
    if not category:
        return APIResponse.error_response(
            message="Category not found",
            code=404,
        )
    post_data = {
        "title": title,
        "body": body,
        "category_id": category_id,
        "is_pinned": is_pinned,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    result = mongo.db.posts.insert_one(post_data)

    # Invalidate blog-related caches so the new post appears immediately
    # - clears the listing cache (`get_blogs`) and any cached single-post entries (`get_blog`)
    try:
        cache.delete_memoized(get_blogs)
        cache.delete_memoized(get_blog)
    except Exception:
        # cache backend might not support delete_memoized in some environments;
        # swallow errors to avoid failing the request but ensure we log for debugging
        current_app.logger.exception(
            "Failed to clear blog caches after add_post"
        )

    return APIResponse.api_response(
        data={"_id": str(result.inserted_id)},
        message="Blog post added successfully",
    )


class BlogPostUpdateSchema(Schema):
    _id = String(required=True)
    title = String(required=True)
    body = String(required=True)
    category_id = Integer(required=True)
    is_pinned = Integer(load_default=0)


@api.post("/post/updatepost")
@api.input(BlogPostUpdateSchema)
@login_required
def update_post(json_data):
    if current_user.id != 1:
        return APIResponse.error_response(
            message="Admin access required.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="Blog database not available",
            code=503,
        )

    post_id = json_data.get("_id")
    title = json_data.get("title")
    body = json_data.get("body")
    category_id = json_data.get("category_id")
    is_pinned = json_data.get("is_pinned", 0)

    try:
        object_id = ObjectId(post_id)
    except InvalidId:
        return APIResponse.error_response(
            message="Invalid blog post ID",
            code=400,
        )

    # Check if post exists
    existing_post = mongo.db.posts.find_one({"_id": object_id})
    if not existing_post:
        return APIResponse.error_response(
            message="Blog post not found",
            code=404,
        )

    # Check if category exists
    category = db.session.execute(
        select(Category).where(Category.id == category_id)
    ).scalar_one_or_none()
    if not category:
        return APIResponse.error_response(
            message="Category not found",
            code=404,
        )

    update_data = {
        "title": title,
        "body": body,
        "category_id": category_id,
        "is_pinned": is_pinned,
        "updated_at": datetime.now(UTC),
    }

    mongo.db.posts.update_one({"_id": object_id}, {"$set": update_data})

    # Invalidate cache
    try:
        cache.delete_memoized(get_blogs)
        cache.delete_memoized(get_blog)
    except Exception:
        current_app.logger.exception(
            "Failed to clear blog caches after update_post"
        )

    return APIResponse.api_response(
        data={"_id": post_id},
        message="Blog post updated successfully",
    )


class BlogPostDeleteSchema(Schema):
    _id = String(required=True)


@api.post("/post/deletepost")
@api.input(BlogPostDeleteSchema)
@login_required
def delete_post(json_data):
    if current_user.id != 1:
        return APIResponse.error_response(
            message="Admin access required.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="Blog database not available",
            code=503,
        )

    post_id = json_data.get("_id")

    try:
        object_id = ObjectId(post_id)
    except InvalidId:
        return APIResponse.error_response(
            message="Invalid blog post ID",
            code=400,
        )

    # Check if post exists
    existing_post = mongo.db.posts.find_one({"_id": object_id})
    if not existing_post:
        return APIResponse.error_response(
            message="Blog post not found",
            code=404,
        )

    mongo.db.posts.delete_one({"_id": object_id})

    # Invalidate cache
    try:
        cache.delete_memoized(get_blogs)
        cache.delete_memoized(get_blog)
        cache.delete_memoized(
            get_categories
        )  # 文章删除后分类统计也可能变化，清除分类缓存
    except Exception:
        current_app.logger.exception(
            "Failed to clear blog caches after delete_post"
        )

    return APIResponse.api_response(
        data={"_id": post_id},
        message="Blog post deleted successfully",
    )


@api.get("/categories")
@cache.cached(timeout=300)
def get_categories() -> ResponseReturnValue:
    categories = (
        db.session.execute(select(Category).order_by(Category.name))
        .scalars()
        .all()
    )

    mongo_cat_counts = {}
    if mongo.db is not None:
        counts = mongo.db.posts.aggregate(
            [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]
        )
        for count in counts:
            mongo_cat_counts[count["_id"]] = count["count"]

    return APIResponse.api_response(
        data=[
            {
                "id": c.id,
                "name": c.name,
                "post_count": mongo_cat_counts.get(c.id, 0),
            }
            for c in categories
        ],
        message="Categories retrieved successfully",
    )


"""
获取分类下的文章接口
"""


class CategoryInSchema(Schema):
    category_id = Integer(required=True)


@api.post("/category")
@api.input(CategoryInSchema, location="query")
def get_posts_by_category(query_data) -> ResponseReturnValue:
    category_id = query_data.get("category_id")
    category = db.session.execute(
        select(Category).where(Category.id == category_id)
    ).scalar_one_or_none()
    if not category:
        return APIResponse.error_response(
            message="Category not found",
            code=404,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="Blog database not available",
            code=503,
        )

    posts = list(
        mongo.db.posts.find({"category_id": category_id}).sort(
            "created_at", -1
        )
    )

    for post in posts:
        post["_id"] = str(post["_id"])
        post["created_at"] = (
            post["created_at"].isoformat() if "created_at" in post else None
        )
        post["updated_at"] = (
            post["updated_at"].isoformat() if "updated_at" in post else None
        )
        post["category"] = {"id": category.id, "name": category.name}

    return APIResponse.api_response(
        data={"posts": posts},
        message=f"Posts in category '{category.name}' retrieved successfully",
    )


# ============================================================================
# Blog Comment Management Endpoints 评论管理路由
# ============================================================================


@api.route("/admin/comments", methods=["GET"])
@login_required
def get_admin_comments() -> tuple[Response, int]:
    """Get all comments (pending and approved) for admin review.

    Admin-only endpoint that returns all comments across all blog posts.
    Requires user to be admin (id == 1).
    """
    if current_user.id != 1:
        return APIResponse.error_response(
            message="Admin access required.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )

    pending: list[dict] = []
    approved: list[dict] = []

    # Iterate all posts and collect comments
    for post in mongo.db.posts.find():
        post_id = str(post["_id"])
        post_title = post.get("title", "Untitled")

        for comment in post.get("comments", []):
            comment_data = {
                "id": str(comment["_id"]),
                "post_id": post_id,
                "post_title": post_title,
                "author": comment.get("author", "Anonymous"),
                "email": comment.get("email", ""),
                "body": comment.get("body", ""),
                "site": comment.get("site", ""),
                "from_admin": comment.get("from_admin", False),
                "reviewed": comment.get("reviewed", False),
                "replied_id": (
                    str(comment["replied_id"])
                    if comment.get("replied_id")
                    else None
                ),
                "created_at": comment.get("created_at").isoformat()
                if comment.get("created_at")
                else None,
            }

            if comment.get("reviewed", False):
                approved.append(comment_data)
            else:
                pending.append(comment_data)

    # Sort by created_at descending (newest first)
    pending.sort(
        key=lambda x: x["created_at"] or "",
        reverse=True,
    )
    approved.sort(
        key=lambda x: x["created_at"] or "",
        reverse=True,
    )

    return APIResponse.api_response(
        data={
            "pending": pending,
            "approved": approved,
        },
        message="Comments retrieved successfully.è¯„è®ºèŽ·å–æˆåŠŸã€‚",
    )


@api.route("/admin/comments/<comment_id>/approve", methods=["POST"])
@login_required
def approve_comment(comment_id: str) -> tuple[Response, int]:
    """Approve a pending comment.

    Admin-only endpoint that marks a comment as reviewed.
    Requires user to be admin (id == 1).
    """
    if current_user.id != 1:
        return APIResponse.error_response(
            message="Admin access required.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )

    try:
        obj_id = ObjectId(comment_id)
    except Exception:
        return APIResponse.error_response(
            message="Invalid comment ID.",
            code=400,
        )

    # Find the post containing this comment
    post = mongo.db.posts.find_one({"comments._id": obj_id})
    if not post:
        return APIResponse.error_response(
            message="Comment not found.",
            code=404,
        )

    # Update the comment's reviewed status
    result = mongo.db.posts.update_one(
        {"comments._id": obj_id},
        {"$set": {"comments.$.reviewed": True}},
    )

    if result.modified_count == 0:
        return APIResponse.error_response(
            message="Comment not found or already approved.",
            code=404,
        )

    cache.delete_memoized(get_comments)
    cache.delete_memoized(get_blog)  # Removed: get_blog is undefined

    return APIResponse.api_response(message="Comment approved successfully.")


@api.route("/admin/comments/<comment_id>/delete", methods=["DELETE"])
@login_required
@csrf.exempt
def delete_comment(comment_id: str) -> tuple[Response, int]:
    """Delete a comment.

    Admin-only endpoint that removes a comment from its post.
    Requires user to be admin (id == 1).
    """
    if current_user.id != 1:
        return APIResponse.error_response(
            message="Admin access required.",
            code=403,
        )

    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )

    try:
        obj_id = ObjectId(comment_id)
    except Exception:
        return APIResponse.error_response(
            message="Invalid comment ID.",
            code=400,
        )

    # Find the post containing this comment
    post = mongo.db.posts.find_one({"comments._id": obj_id})
    if not post:
        return APIResponse.error_response(
            message="Comment not found.",
            code=404,
        )

    # Remove the comment from the array
    result = mongo.db.posts.update_one(
        {"_id": post["_id"]},
        {"$pull": {"comments": {"_id": obj_id}}},
    )

    if result.modified_count == 0:
        return APIResponse.error_response(
            message="Comment not found.",
            code=404,
        )

    cache.delete_memoized(get_comments)
    cache.delete_memoized(get_blog)  # Removed: get_blog is undefined

    return APIResponse.api_response(message="Comment deleted successfully.")


""" 评论相关 API 路由 """


class GetComment(Schema):
    post_id = String(required=True)


class PostComment(Schema):
    post_id = String(required=True)
    body = String(required=True, validate=lambda x: 1 <= len(x) <= 1000)
    author = String(required=True, validate=lambda x: 1 <= len(x) <= 50)
    reply_to = String(required=False)
    reply_to_author = String(required=False, validate=lambda x: len(x) <= 50)


# 回复评论接口，支持对文章的评论进行回复。
@api.post("/comments")
@api.input(PostComment)
def post_comment(json_data) -> tuple[Response, int]:
    """Submit a new comment to a blog post.

    Args:
        json_data: JSON object containing post_id, body, author, and optional reply_to, reply_to_author

    Returns:
        JSON response indicating success or failure.

    Example Response (Success):
        {
            "status": "success",
            "message": "Comment submitted successfully, pending review",
            "data": {"id": "60f5a3b2c25e4b3d88f1e8c9"}
        }
    """
    post_id = json_data["post_id"]
    body = json_data["body"].strip()
    author = json_data["author"].strip() or "Anonymous"
    created_at = datetime.now(UTC)
    replied_id = None

    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )

    # 如果提供了 reply_to 字段，验证它是否是一个有效的 ObjectId，并且对应的评论存在于该文章中
    if json_data.get("reply_to"):
        try:
            reply_to_obj = ObjectId(json_data["reply_to"])
            # 查询文章中是否存在这个评论，确保 reply_to 是该文章下的一个评论 ID
            post = mongo.db.posts.find_one(
                {"_id": ObjectId(post_id), "comments._id": reply_to_obj}
            )
            # 如果查询结果存在，说明 reply_to_obj 是该文章下的一个有效评论 ID，可以将其作为 replied_id 保存到新评论中
            if post:
                replied_id = reply_to_obj
            else:
                return APIResponse.error_response(
                    message="Comment to reply not found.",
                    code=404,
                )
        except Exception:
            return APIResponse.error_response(
                message="Invalid reply_to format.",
                code=400,
            )

    comment = {
        "_id": ObjectId(),
        "author": escape(author),
        "body": escape(body),
        "created_at": created_at,
        "reviewed": False,
    }
    # 如果是回复评论，保存被回复评论的 ID 和被回复评论的作者昵称（如果提供了 reply_to_author 字段）
    if replied_id:
        comment["replied_id"] = replied_id
        if json_data.get("reply_to_author"):
            comment["reply_to_author"] = json_data["reply_to_author"]

    result = mongo.db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$push": {"comments": comment}},
    )
    cache.delete_memoized(get_comments)
    if result.modified_count == 0:
        return APIResponse.error_response(
            message="Post not found.",
            code=404,
        )

    return APIResponse.api_response(
        data={"_id": str(comment["_id"])},
        message="Comment submitted successfully, pending review",
    )


# 获取评论接口，返回指定文章的所有已审核评论，支持嵌套回复结构.
@api.get("/comments")
@api.input(GetComment, location="query")
@cache.memoize(timeout=60)
def get_comments(query_data) -> tuple[Response, int]:
    """Get comments for a specific blog post with nested reply structure.

    Args:
        post_id: ID of the blog post to retrieve comments for
    Returns:
        JSON response with nested comments tree or error.
    """
    post_id = query_data["post_id"]
    if mongo.db is None:
        return APIResponse.error_response(
            message="MongoDB is not available.",
            code=500,
        )
    try:
        obj_id = ObjectId(post_id)
    except Exception:
        return APIResponse.error_response(
            message="Invalid post ID.",
            code=400,
        )
    post = mongo.db.posts.find_one({"_id": obj_id})
    if not post:
        return APIResponse.error_response(
            message="Post not found.",
            code=404,
        )
    comments = post.get("comments", [])

    # 筛选已审核的评论
    reviewed_comments = []
    for comment in comments:
        if comment.get("reviewed", False):
            reviewed_comments.append(
                {
                    "_id": str(comment["_id"]),
                    "author": comment.get("author", "Anonymous"),
                    "body": comment.get("body", ""),
                    "created_at": comment.get("created_at").isoformat()
                    if comment.get("created_at")
                    else None,
                    "reply_to_author": comment.get("reply_to_author", ""),
                    "replied_id": str(comment["replied_id"])
                    if "replied_id" in comment
                    else None,
                    "comments": [],  # 初始化子评论数组
                }
            )

    # 构建评论树结构
    comment_map = {comment["_id"]: comment for comment in reviewed_comments}
    comment_tree = []

    for comment in reviewed_comments:
        if comment["replied_id"] is None:
            # 顶级评论
            comment_tree.append(comment)
        else:
            # 子评论，添加到对应的父评论下
            parent_id = comment["replied_id"]
            if parent_id in comment_map:
                comment_map[parent_id]["comments"].append(comment)

    return APIResponse.api_response(
        data={"comments": comment_tree},
        message="Comments retrieved successfully.",
    )


# "comments": [
#       {
#         "_id": "6992e2be3a3e9ab9faac9780",
#         "author": "admin",
#         "body": "😊👍👍",
#         "created_at": null,
#         "reply_to_author": "",
#         "replied_id": null,
#         "reviewed": false
#         "comments": [
#           {
#             "_id": "6992e2be3a3e9ab9faac9781",
#             "author": "John Doe",
#             "body": "Great post!",
#             "created_at": "2024-06-01T12:34:56Z",
#             "reply_to_author": "admin",
#             "replied_id": "6992e2be3a3e9ab9faac9780",
#             "reviewed": false
#           }]
#       }]
