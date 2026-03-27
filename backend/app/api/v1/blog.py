from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import JSONResponse
from starlette import status

from app.api.des.auth import manager
from app.api.des.des import blog_service_dep
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import PostComment
from app.services.blog_service import BlogDomainError, BlogService
from app.utils import redis_cache
from app.utils.media import save_upload_image

router = APIRouter(tags=["blog"])


@router.post("/upload-image")
@router.post("/blog/upload-image")
async def upload_blog_image(
    file: UploadFile = File(),
    user: User = Depends(manager),
) -> JSONResponse:
    """Upload blog image and return public URL."""
    if not file or not file.filename:
        return APIResponse.error(
            message="No image provided.",
            code=status.HTTP_400_BAD_REQUEST,
        )

    relative_path = save_upload_image(file, f"posts/{user.id}")
    return APIResponse.ok(
        data={
            "url": f"/api/v1/media/{relative_path}",
            "filename": relative_path,
        },
        message="Image uploaded successfully.",
        code=status.HTTP_200_OK,
    )


@router.get("/blogs")
@redis_cache(ttl=60, exclude=["blog_service"])
async def get_blogs(
    page: int = 1,
    search: str | None = Query(None, min_length=1),
    blog_service: BlogService = Depends(blog_service_dep),
) -> JSONResponse:
    """Get paginated list of blog articles."""
    try:
        data = await blog_service.get_blogs(page=page, search=search)
    except BlogDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    return APIResponse.ok(data=data, message="Blogs retrieved successfully")


### 获取单个博客文章详情（修复：增加了对 ObjectId 的验证，处理了分类信息和评论树的构建） ###
@router.get("/post")
@redis_cache(ttl=60, exclude=["blog_service"])
async def get_blog_post(
    _id: Annotated[str | None, Query(description="Blog post ID")] = None,
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Get a single blog post by ID."""
    try:
        post_data = await blog_service.get_blog_post(_id)
    except BlogDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    return APIResponse.ok(
        data=post_data, message="Blog post retrieved successfully"
    )


@router.post("/comments")
async def post_comment(
    data: PostComment,
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Submit a new comment to a blog post."""
    try:
        result = await blog_service.post_comment(data)
    except BlogDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data=result,
        message="Comment submitted successfully, pending review",
    )


@router.get("/categories")
async def get_categories(
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Get all categories with post counts."""
    try:
        categories = await blog_service.get_categories()
    except BlogDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data=categories,
        message="Categories retrieved successfully",
    )


@router.post("/category")
async def get_posts_by_category(
    category_id: Annotated[int, Query(..., description="Category ID")],
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Get posts by category."""
    try:
        data = await blog_service.get_posts_by_category(category_id)
    except BlogDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    category_name = data["category"]["name"]
    return APIResponse.ok(
        data=data,
        message=f"Posts in category '{category_name}' retrieved successfully",
    )


# =============================================================================
# Post and Comment Management Endpoints have been moved to admin.py
# =============================================================================
