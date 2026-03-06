from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from typing import Annotated

from beanie import SortDirection
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.dependencies.database import get_session
from app.models.mgmodel import Post
from app.models.models import Category
from app.schemas import PostComment
from app.schemas.response import APIResponse

router = APIRouter(tags=["blog"])


# 获取分类列表和每个分类的文章数量（修复：把这个函数放在外面，单独处理分类和数量的逻辑）
async def _get_categories_with_counts(
    session: AsyncSession,
):
    """Get all categories with their post counts."""
    # 1. Get all categories from PostgreSQL
    result = await session.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()

    # 2. Count posts per category from MongoDB
    category_counts: dict[int, int] = {}

    # 修复：必须先 await aggregate，拿到游标后再 async for
    pipeline = [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]

    # 👇 注意这里多了一个 await
    cursor = await Post.find_all().aggregate(pipeline).to_list()

    for doc in cursor:
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
    session: AsyncSession = Depends(get_session),
) -> JSONResponse:
    """Get paginated list of blog articles."""
    per_page = 10  # 每页文章数量

    # 1. Get total count
    total = await Post.find().count()  # 使用 Beanie 的 count 方法获取总数

    # 2. Calculate pagination
    skip = (page - 1) * per_page
    pages = (total + per_page - 1) // per_page if per_page > 0 else 0

    # 3. Fetch posts

    posts: list[Post] = (
        await Post.find_all()
        .sort(
            [
                ("is_pinned", SortDirection.DESCENDING),  # 先按是否置顶排序
                ("created_at", SortDirection.DESCENDING),  # 再按创建时间排序
            ]
        )
        .skip(skip)
        .limit(per_page)
        .to_list()
    )

    # 4. Get categories
    category_list, category_counts = await _get_categories_with_counts(session)

    # 5. Merge category info
    result = await session.execute(select(Category))
    cat_map = {c.id: c for c in result.scalars().all()}

    # Convert Post objects to dicts and add category info
    post_dicts = []
    for post in posts:
        post_data = {
            "_id": str(post.id),
            "title": post.title,
            "body": post.body,
            "category_id": post.category_id,
            "is_pinned": post.is_pinned,
            "created_at": post.created_at.isoformat()
            if post.created_at
            else None,
            "updated_at": post.updated_at.isoformat()
            if post.updated_at
            else None,
            "comments": [],  # For list view, skip detailed comments
        }
        cat_id = post_data.get("category_id")
        post_data["category"] = (
            {"id": cat_map[cat_id].id, "name": cat_map[cat_id].name}
            if (cat_id and cat_id in cat_map)
            else None
        )
        post_dicts.append(post_data)

    # 6. Build response

    response_data = {
        "posts": post_dicts,
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
    session: AsyncSession = Depends(get_session),
):
    """Get a single blog post by ID."""
    # Determine which ID to use (prioritize _id for backward compatibility)
    actual_post_id: str | None = _id
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

    # Fetch post
    post = await Post.find_one({"_id": object_id})

    if not post:
        return APIResponse.error(
            message="Blog post not found",
            code=404,
        )

    # Build post data
    post_data = {
        "_id": str(post.id),
        "title": post.title,
        "body": post.body,
        "category_id": post.category_id,
        "is_pinned": post.is_pinned,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "updated_at": post.updated_at.isoformat() if post.updated_at else None,
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
    comments = post.comments
    reviewed_comments = []

    for comment in comments:
        if comment.reviewed:
            reviewed_comments.append(
                {
                    "_id": str(comment.id),
                    "author": comment.author,
                    "body": comment.body,
                    "created_at": comment.created_at.isoformat()
                    if comment.created_at
                    else None,
                    "reviewed": comment.reviewed,
                    "replied_id": str(comment.replied_id)
                    if comment.replied_id
                    else None,
                    "reply_to_author": comment.reply_to_author or "",
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


@router.post("/comments")
async def post_comment(
    data: PostComment,
):
    """Submit a new comment to a blog post."""
    post_id = data.post_id
    body = data.body.strip()
    author = data.author.strip() or "Anonymous"
    created_at = datetime.now(UTC)
    replied_id = None
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
            post = await Post.find_one(
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
    try:
        await Post.find_one(Post.id == post_obj_id).update(
            {"$push": {"comments": comment}}
        )  # type: ignore
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to submit comment: {e!s}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return APIResponse.ok(
        data={"_id": str(comment["_id"])},
        message="Comment submitted successfully, pending review",
    )


@router.get("/categories")
async def get_categories(
    session: AsyncSession = Depends(get_session),
):
    """Get all categories with post counts."""
    # Get all categories from PostgreSQL
    result = await session.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    # Count posts per category from MongoDB
    category_counts: dict[int, int] = {}
    pipeline = [{"$group": {"_id": "$category_id", "count": {"$sum": 1}}}]
    cat_group: list[dict[str, int]] = (
        await Post.find_all().aggregate(pipeline).to_list()
    )
    for doc in cat_group:
        cat_id = doc.get("_id")
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
    # Get posts for this category
    cursor = Post.find(Post.category_id == category_id).sort(
        [("created_at", SortDirection.DESCENDING)]
    )
    posts = []
    async for post in cursor:
        post_data = {
            "_id": str(post.id),
            "title": post.title,
            "body": post.body,
            "category_id": post.category_id,
            "is_pinned": post.is_pinned,
            "created_at": post.created_at.isoformat()
            if post.created_at
            else None,
            "updated_at": post.updated_at.isoformat()
            if post.updated_at
            else None,
            "category": {"id": category.id, "name": category.name},
        }
        posts.append(post_data)
    return APIResponse.ok(
        data={
            "posts": posts,
            "category": {"id": category.id, "name": category.name},
        },
        message=f"Posts in category '{category.name}' retrieved successfully",
    )


# =============================================================================
# Post and Comment Management Endpoints have been moved to admin.py
# =============================================================================
