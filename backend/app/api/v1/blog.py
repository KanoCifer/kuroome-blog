from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile
from fastapi.responses import JSONResponse
from starlette import status

from app.api.des.auth import manager
from app.api.des.des import blog_service_dep
from app.core.exceptions import APIError
from app.core.logger import logger
from app.core.response import APIResponse
from app.models.models import User
from app.schemas.schemas import PostComment
from app.services.blog_service import BlogService
from app.plugins.cache import redis_cache
from app.utils.media import save_upload_image

router = APIRouter(tags=["blog"])


async def _safe_invalidate(*func_names: str) -> None:
    """写后清理缓存。失败降级为日志,不影响主流程。"""
    try:
        await redis_cache.invalidate(*func_names)
    except Exception:
        logger.exception("cache invalidation failed (non-fatal)")


@router.post("/upload-image")
@router.post("/blog/upload-image")
async def upload_blog_image(
    file: UploadFile = File(),
    user: User = Depends(manager),
) -> APIResponse:
    """Upload blog image and return public URL."""
    if not file or not file.filename:
        raise APIError(
            message="No image provided.",
            code=status.HTTP_400_BAD_REQUEST,
        )

    relative_path = save_upload_image(file, f"posts/{user.id}")
    return APIResponse(
        data={
            "url": f"/api/v1/media/{relative_path}",
            "filename": relative_path,
        },
        message="Image uploaded successfully.",
    )


@router.get("/blogs")
@redis_cache(ttl=60, exclude=["blog_service"])
async def get_blogs(
    page: int = 1,
    search: str | None = Query(None, min_length=1),
    blog_service: BlogService = Depends(blog_service_dep),
) -> APIResponse:
    """Get paginated list of blog articles."""
    data = await blog_service.get_blogs(page=page, search=search)
    return APIResponse(data=data, message="Blogs retrieved successfully")


### 获取单个博客文章详情（修复：增加了对 ObjectId 的验证，处理了分类信息和评论树的构建） ###
@router.get("/post")
@redis_cache(ttl=60, exclude=["blog_service"])
async def get_blog_post(
    _id: Annotated[str | None, Query(description="Blog post ID")] = None,
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Get a single blog post by ID."""
    post_data = await blog_service.get_blog_post(_id)
    return APIResponse(
        data=post_data, message="Blog post retrieved successfully"
    )


### 获取单个博客文章详情（修复：增加了对 ObjectId 的验证，处理了分类信息和评论树的构建） ###
@router.get("/blogs/{_id}")
@redis_cache(ttl=60, exclude=["blog_service"])
async def get_blog(
    _id: Annotated[str | None, Path(description="Blog post ID")],
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Get a single blog post by ID."""
    post_data = await blog_service.get_blog_post(_id)
    return APIResponse(
        data=post_data, message="Blog post retrieved successfully"
    )


@router.post("/comments", status_code=status.HTTP_201_CREATED)
async def post_comment(
    data: PostComment,
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Submit a new comment to a blog post."""
    result = await blog_service.post_comment(data)
    await _safe_invalidate("get_blogs", "get_blog_post")

    return APIResponse(
        data=result,
        message="Comment submitted successfully, pending review",
    )


@router.get("/categories")
async def get_categories(
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Get all categories with post counts."""
    categories = await blog_service.get_categories()

    return APIResponse(
        data=categories,
        message="Categories retrieved successfully",
    )


@router.post("/category")
async def get_posts_by_category(
    category_id: Annotated[int, Query(..., description="Category ID")],
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Get posts by category."""
    data = await blog_service.get_posts_by_category(category_id)

    category_name = data["category"]["name"]
    return APIResponse(
        data=data,
        message=f"Posts in category '{category_name}' retrieved successfully",
    )


@router.get("/blogs/categories/{category_id}")
async def get_category_posts(
    category_id: Annotated[int, Path(..., description="Category ID")],
    blog_service: BlogService = Depends(blog_service_dep),
):
    """Get posts by category."""
    data = await blog_service.get_posts_by_category(category_id)

    category_name = data["category"]["name"]
    return APIResponse(
        data=data,
        message=f"Posts in category '{category_name}' retrieved successfully",
    )


# =============================================================================
# Post and Comment Management Endpoints have been moved to admin.py
# =============================================================================
