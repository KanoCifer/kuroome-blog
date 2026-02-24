"""Blog router for article list, detail, and comment endpoints.

This module provides endpoints for retrieving blog articles and managing comments:
- GET /api/blogs - Get paginated article list
- GET /api/post - Get single article detail by ID
- POST /api/post/addpost - Add a new blog post (admin)
- POST /api/post/updatepost - Update an existing blog post (admin)
- POST /api/post/deletepost - Delete a blog post (admin)
- GET /api/categories - Get all categories with post counts
- POST /api/category - Get posts by category
- POST /api/comments - Submit a new comment
- GET /api/comments - Get comments for a post
- GET /api/admin/comments - Get all comments for admin review
- POST /api/admin/comments/{comment_id}/approve - Approve a pending comment
- DELETE /api/admin/comments/{comment_id}/delete - Delete a comment
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, Query, status
from markupsafe import escape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import manager
from app.dependencies.database import get_session
from app.dependencies.mongo import get_mongo_db
from app.models.models import Category, User
from app.schemas.response import APIResponse
from app.schemas.schemas import BlogPostIn, BlogPostUpdate, PostComment

router = APIRouter(tags=["blog"])


# 获取分类列表和每个分类的文章数量（修复：把这个函数放在外面，单独处理分类和数量的逻辑）
async def _get_categories_with_counts(
    session: AsyncSession,
    mongo_db,  # 修复1: 去掉 Depends，手动传参；加上类型注解
):
    """Get all categories with their post counts."""
    # 1. Get all categories from PostgreSQL
    result = await session.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()

    # 2. Count posts per category from MongoDB
    category_counts: dict[int, int] = {}
    posts_collection = mongo_db["posts"]

    # 修复：必须先 await aggregate，拿到游标后再 async for
    pipeline = [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]

    # 👇 注意这里多了一个 await
    cursor = await posts_collection.aggregate(pipeline)

    async for doc in cursor:
        cat_id = doc["_id"]
        if cat_id is not None:
            category_counts[cat_id] = doc["count"]
    # 3. Build category list
    category_list = [
        {
            "id": c.id,
            "name": c.name,
            "posts_count": category_counts.get(c.id, 0),
        }
        for c in categories
    ]

    return category_list, category_counts


@router.get("/blogs")
async def get_blogs(
    page: int = 1,
    mongo_db=Depends(get_mongo_db),
    session: AsyncSession = Depends(get_session),
) -> APIResponse:
    """Get paginated list of blog articles."""
    per_page = 10
    posts_collection = mongo_db["posts"]

    # 1. Get total count
    total = await posts_collection.count_documents({})

    # 2. Calculate pagination
    skip = (page - 1) * per_page
    pages = (total + per_page - 1) // per_page if per_page > 0 else 0

    # 3. Fetch posts
    cursor = (
        posts_collection.find({})
        .sort([("is_pinned", -1), ("created_at", -1)])
        .skip(skip)
        .limit(per_page)
    )

    posts = []
    async for post in cursor:
        post_data = {
            "_id": str(post["_id"]),
            "title": post.get("title", ""),
            "body": post.get("body", ""),
            "category_id": post.get("category_id"),
            "is_pinned": post.get("is_pinned", 0),
            "created_at": post["created_at"].isoformat()
            if post.get("created_at")
            else None,
            "updated_at": post["updated_at"].isoformat()
            if post.get("updated_at")
            else None,
        }
        posts.append(post_data)

    # 4. Get categories (这里直接传 mongo_db 进去)
    category_list, category_counts = await _get_categories_with_counts(
        session, mongo_db
    )

    # 5. Merge category info
    result = await session.execute(select(Category))
    cat_map = {c.id: c for c in result.scalars().all()}

    for post in posts:
        cat_id = post.get("category_id")
        post["category"] = (
            {"id": cat_map[cat_id].id, "name": cat_map[cat_id].name}
            if (cat_id and cat_id in cat_map)
            else None
        )

    # 6. Build response
    response_data = {
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
    }

    return APIResponse.ok(
        data=response_data, message="Blogs retrieved successfully"
    )


### 获取单个博客文章详情（修复：增加了对 ObjectId 的验证，处理了分类信息和评论树的构建） ###
@router.get("/post")
async def get_blog_post(
    _id: Annotated[str | None, Query(description="Blog post ID")] = None,
    post_id: Annotated[str | None, Query(description="Blog post ID")] = None,
    mongo_db=Depends(get_mongo_db),
    session: AsyncSession = Depends(get_session),
):
    """Get a single blog post by ID."""
    # Determine which ID to use (prioritize _id for backward compatibility)
    actual_post_id = _id or post_id
    if not actual_post_id:
        return APIResponse.error(
            message="Either _id or post_id parameter is required",
            code=400,
        )
    # Validate ObjectId
    try:
        object_id = ObjectId(actual_post_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid blog post ID",
            code=400,
        )

    posts_collection = mongo_db["posts"]

    # Fetch post
    post = await posts_collection.find_one({"_id": object_id})

    if not post:
        return APIResponse.error(
            message="Blog post not found",
            code=404,
        )

    # Build post data
    post_data = {
        "_id": str(post["_id"]),
        "title": post.get("title", ""),
        "body": post.get("body", ""),
        "category_id": post.get("category_id"),
        "is_pinned": post.get("is_pinned", 0),
        "created_at": post["created_at"].isoformat()
        if post.get("created_at")
        else None,
        "updated_at": post["updated_at"].isoformat()
        if post.get("updated_at")
        else None,
    }

    # Get category info
    cat_id = post_data.get("category_id")
    if cat_id:
        result = await session.execute(
            select(Category).where(Category.id == cat_id)
        )
        category = result.scalar_one_or_none()
        if category:
            post_data["category"] = {"id": category.id, "name": category.name}
        else:
            post_data["category"] = None
    else:
        post_data["category"] = None

    # Process comments
    comments = post.get("comments", [])
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
                    "reviewed": comment.get("reviewed", False),
                    "replied_id": str(comment["replied_id"])
                    if "replied_id" in comment
                    else None,
                    "reply_to_author": comment.get("reply_to_author", ""),
                    "comments": [],  # Initialize nested comments array
                }
            )

    # Build comment tree
    comment_map = {comment["_id"]: comment for comment in reviewed_comments}
    comment_tree = []

    for comment in reviewed_comments:
        if comment["replied_id"] is None:
            # Top-level comment
            comment_tree.append(comment)
        else:
            # Nested comment, add to parent
            parent_id = comment["replied_id"]
            if parent_id in comment_map:
                comment_map[parent_id]["comments"].append(comment)

    post_data["comments"] = comment_tree

    # Cache the result

    return APIResponse.ok(
        data=post_data,
        message="Blog post retrieved successfully",
    )


# =============================================================================
# Post Management Endpoints - 文章管理路由
# =============================================================================


@router.post("/post/addpost")
async def add_post(
    data: BlogPostIn,
    current_user: User = Depends(manager),
    mongo_db=Depends(get_mongo_db),
    session: AsyncSession = Depends(get_session),
):
    """Add a new blog post."""
    if not current_user.is_admin:
        return APIResponse.error(
            message="Admin access required",
            code=status.HTTP_403_FORBIDDEN,
        )

    title = data.title
    body = data.body
    category_id = data.category_id
    is_pinned = data.is_pinned

    # Check if category exists
    result = await session.execute(
        select(Category).where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        return APIResponse.error(
            message="Category not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    posts_collection = mongo_db["posts"]

    post_data = {
        "title": title,
        "body": body,
        "category_id": category_id,
        "is_pinned": is_pinned,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    result = await posts_collection.insert_one(post_data)

    return APIResponse.ok(
        data={"_id": str(result.inserted_id)},
        message="Blog post added successfully",
    )


@router.post("/post/updatepost")
async def update_post(
    data: BlogPostUpdate,
    current_user: User = Depends(manager),
    mongo_db=Depends(get_mongo_db),
    session: AsyncSession = Depends(get_session),
):
    """Update an existing blog post."""
    if not current_user.is_admin:
        return APIResponse.error(
            message="Admin access required",
            code=status.HTTP_403_FORBIDDEN,
        )

    post_id = data.id
    title = data.title
    body = data.body
    category_id = data.category_id
    is_pinned = data.is_pinned

    try:
        object_id = ObjectId(post_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid blog post ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    posts_collection = mongo_db["posts"]

    # Check if post exists
    existing_post = await posts_collection.find_one({"_id": object_id})
    if not existing_post:
        return APIResponse.error(
            message="Blog post not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    # Check if category exists
    result = await session.execute(
        select(Category).where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        return APIResponse.error(
            message="Category not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    update_data = {
        "title": title,
        "body": body,
        "category_id": category_id,
        "is_pinned": is_pinned,
        "updated_at": datetime.now(UTC),
    }

    await posts_collection.update_one(
        {"_id": object_id}, {"$set": update_data}
    )

    return APIResponse.ok(
        data={"_id": post_id},
        message="Blog post updated successfully",
    )


@router.post("/post/deletepost")
async def delete_post(
    data: BlogPostUpdate,
    current_user: User = Depends(manager),
    mongo_db=Depends(get_mongo_db),
):
    """Delete a blog post."""
    if not current_user.is_admin:
        return APIResponse.error(
            message="Admin access required",
            code=status.HTTP_403_FORBIDDEN,
        )

    post_id = data.id

    try:
        object_id = ObjectId(post_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid blog post ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    posts_collection = mongo_db["posts"]

    # Check if post exists
    existing_post = await posts_collection.find_one({"_id": object_id})
    if not existing_post:
        return APIResponse.error(
            message="Blog post not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    await posts_collection.delete_one({"_id": object_id})

    return APIResponse.ok(
        data={"_id": post_id},
        message="Blog post deleted successfully",
    )


@router.get("/categories")
async def get_categories(
    mongo_db=Depends(get_mongo_db),
    session: AsyncSession = Depends(get_session),
):
    """Get all categories with post counts."""
    # Get all categories from PostgreSQL
    result = await session.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()

    # Count posts per category from MongoDB
    category_counts: dict[int, int] = {}
    posts_collection = mongo_db["posts"]

    pipeline = [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]
    cursor = await posts_collection.aggregate(pipeline)

    async for doc in cursor:
        cat_id = doc["_id"]
        if cat_id is not None:
            category_counts[cat_id] = doc["count"]

    return APIResponse.ok(
        data=[
            {
                "id": c.id,
                "name": c.name,
                "post_count": category_counts.get(c.id, 0),
            }
            for c in categories
        ],
        message="Categories retrieved successfully",
    )


@router.post("/category")
async def get_posts_by_category(
    category_id: Annotated[int, Query(..., description="Category ID")],
    mongo_db=Depends(get_mongo_db),
    session: AsyncSession = Depends(get_session),
):
    """Get posts by category."""
    # Get category info
    result = await session.execute(
        select(Category).where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        return APIResponse.error(
            message="Category not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    posts_collection = mongo_db["posts"]

    # Get posts for this category
    cursor = posts_collection.find({"category_id": category_id}).sort(
        "created_at", -1
    )

    posts = []
    async for post in cursor:
        post_data = {
            "_id": str(post["_id"]),
            "title": post.get("title", ""),
            "body": post.get("body", ""),
            "category_id": post.get("category_id"),
            "is_pinned": post.get("is_pinned", 0),
            "created_at": post["created_at"].isoformat()
            if post.get("created_at")
            else None,
            "updated_at": post["updated_at"].isoformat()
            if post.get("updated_at")
            else None,
            "category": {"id": category.id, "name": category.name},
        }
        posts.append(post_data)

    return APIResponse.ok(
        data={"posts": posts},
        message=f"Posts in category '{category.name}' retrieved successfully",
    )


# =============================================================================
# Comment Management Endpoints - 评论管理路由
# =============================================================================


@router.post("/comments")
async def post_comment(
    data: PostComment,
    mongo_db=Depends(get_mongo_db),
):
    """Submit a new comment to a blog post."""
    post_id = data.post_id
    body = data.body.strip()
    author = data.author.strip() or "Anonymous"
    created_at = datetime.now(UTC)
    replied_id = None

    posts_collection = mongo_db["posts"]

    try:
        post_obj_id = ObjectId(post_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid post ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # If reply_to is provided, validate it
    if data.reply_to:
        try:
            reply_to_obj = ObjectId(data.reply_to)
            # Check if the comment exists in this post
            post = await posts_collection.find_one(
                {"_id": post_obj_id, "comments._id": reply_to_obj}
            )
            if post:
                replied_id = reply_to_obj
            else:
                return APIResponse.error(
                    message="Comment to reply not found",
                    code=status.HTTP_404_NOT_FOUND,
                )
        except InvalidId:
            return APIResponse.error(
                message="Invalid reply_to format",
                code=status.HTTP_400_BAD_REQUEST,
            )

    comment = {
        "_id": ObjectId(),
        "author": escape(author),
        "body": escape(body),
        "created_at": created_at,
        "reviewed": False,
    }

    if replied_id:
        comment["replied_id"] = replied_id
        if data.reply_to_author:
            comment["reply_to_author"] = data.reply_to_author

    result = await posts_collection.update_one(
        {"_id": post_obj_id},
        {"$push": {"comments": comment}},
    )

    if result.modified_count == 0:
        return APIResponse.error(
            message="Post not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    return APIResponse.ok(
        data={"_id": str(comment["_id"])},
        message="Comment submitted successfully, pending review",
    )


@router.get("/comments")
async def get_comments(
    post_id: Annotated[str, Query(..., description="Post ID")],
    mongo_db=Depends(get_mongo_db),
):
    """Get comments for a specific blog post with nested reply structure."""
    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid post ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    posts_collection = mongo_db["posts"]
    post = await posts_collection.find_one({"_id": obj_id})

    if not post:
        return APIResponse.error(
            message="Post not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    comments = post.get("comments", [])

    # Filter reviewed comments
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
                    "comments": [],
                }
            )

    # Build comment tree
    comment_map = {comment["_id"]: comment for comment in reviewed_comments}
    comment_tree = []

    for comment in reviewed_comments:
        if comment["replied_id"] is None:
            comment_tree.append(comment)
        else:
            parent_id = comment["replied_id"]
            if parent_id in comment_map:
                comment_map[parent_id]["comments"].append(comment)

    return APIResponse.ok(
        data={"comments": comment_tree},
        message="Comments retrieved successfully",
    )


# =============================================================================
# Admin Comment Management Endpoints
# =============================================================================


@router.get("/admin/comments")
async def get_admin_comments(
    current_user: User = Depends(manager),
    mongo_db=Depends(get_mongo_db),
):
    """Get all comments (pending and approved) for admin review.

    Admin-only endpoint.
    """
    if not current_user.is_admin:
        return APIResponse.error(
            message="Admin access required",
            code=status.HTTP_403_FORBIDDEN,
        )

    posts_collection = mongo_db["posts"]
    pending: list[dict] = []
    approved: list[dict] = []

    # Iterate all posts and collect comments
    cursor = posts_collection.find({})
    async for post in cursor:
        post_id_str = str(post["_id"])
        post_title = post.get("title", "Untitled")

        for comment in post.get("comments", []):
            comment_data = {
                "id": str(comment["_id"]),
                "_id": str(comment["_id"]),
                "post_id": post_id_str,
                "post_title": post_title,
                "author": comment.get("author", "Anonymous"),
                "email": comment.get("email", ""),
                "body": comment.get("body", ""),
                "site": comment.get("site", ""),
                "from_admin": comment.get("from_admin", False),
                "reviewed": comment.get("reviewed", False),
                "replied_id": str(comment["replied_id"])
                if comment.get("replied_id")
                else None,
                "created_at": comment.get("created_at").isoformat()
                if comment.get("created_at")
                else None,
            }

            if comment.get("reviewed", False):
                approved.append(comment_data)
            else:
                pending.append(comment_data)

    # Sort by created_at descending
    pending.sort(
        key=lambda x: x["created_at"] or "",
        reverse=True,
    )
    approved.sort(
        key=lambda x: x["created_at"] or "",
        reverse=True,
    )

    return APIResponse.ok(
        data={
            "pending": pending,
            "approved": approved,
        },
        message="Comments retrieved successfully",
    )


@router.post("/admin/comments/{comment_id}/approve")
async def approve_comment(
    comment_id: str,
    current_user: User = Depends(manager),
    mongo_db=Depends(get_mongo_db),
):
    """Approve a pending comment.

    Admin-only endpoint.
    """
    if not current_user.is_admin:
        return APIResponse.error(
            message="Admin access required",
            code=status.HTTP_403_FORBIDDEN,
        )

    try:
        obj_id = ObjectId(comment_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid comment ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    posts_collection = mongo_db["posts"]

    # Find the post containing this comment
    post = await posts_collection.find_one({"comments._id": obj_id})
    if not post:
        return APIResponse.error(
            message="Comment not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    # Update the comment's reviewed status
    result = await posts_collection.update_one(
        {"comments._id": obj_id},
        {"$set": {"comments.$.reviewed": True}},
    )

    if result.modified_count == 0:
        return APIResponse.error(
            message="Comment not found or already approved",
            code=status.HTTP_404_NOT_FOUND,
        )

    return APIResponse.ok(message="Comment approved successfully")


@router.delete("/admin/comments/{comment_id}/delete")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(manager),
    mongo_db=Depends(get_mongo_db),
):
    """Delete a comment.

    Admin-only endpoint.
    """
    if not current_user.is_admin:
        return APIResponse.error(
            message="Admin access required",
            code=status.HTTP_403_FORBIDDEN,
        )

    try:
        obj_id = ObjectId(comment_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid comment ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    posts_collection = mongo_db["posts"]

    # Find the post containing this comment
    post = await posts_collection.find_one({"comments._id": obj_id})
    if not post:
        return APIResponse.error(
            message="Comment not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    # Remove the comment from the array
    result = await posts_collection.update_one(
        {"_id": post["_id"]},
        {"$pull": {"comments": {"_id": obj_id}}},
    )

    if result.modified_count == 0:
        return APIResponse.error(
            message="Comment not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    return APIResponse.ok(message="Comment deleted successfully")
