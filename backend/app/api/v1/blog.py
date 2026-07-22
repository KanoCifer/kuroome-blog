from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app.api.des.appstate import get_app_state
from app.appstate import AppState
from app.core.response import APIResponse
from app.plugins.cache import redis_cache

router = APIRouter(tags=["blog"])


@router.get("/blogs")
@redis_cache(ttl=60, exclude=["state"])
async def get_blogs(
    page: int = 1,
    search: str | None = Query(None, min_length=1),
    state: AppState = Depends(get_app_state),
) -> APIResponse:
    """Get paginated list of blog articles."""
    data = await state.blog_svc.get_blogs(page=page, search=search)
    return APIResponse(data=data, message="Blogs retrieved successfully")


### 获取单个博客文章详情（修复：增加了对 ObjectId 的验证，处理了分类信息和评论树的构建） ###
@router.get("/post")
@redis_cache(ttl=60, exclude=["state"])
async def get_blog_post(
    _id: Annotated[str | None, Query(description="Blog post ID")] = None,
    state: AppState = Depends(get_app_state),
):
    """Get a single blog post by ID."""
    post_data = await state.blog_svc.get_blog_post(_id)
    return APIResponse(
        data=post_data, message="Blog post retrieved successfully"
    )


### 获取单个博客文章详情（修复：增加了对 ObjectId 的验证，处理了分类信息和评论树的构建） ###
@router.get("/blogs/{_id}")
@redis_cache(ttl=60, exclude=["state"])
async def get_blog(
    _id: Annotated[str | None, Path(description="Blog post ID")],
    state: AppState = Depends(get_app_state),
):
    """Get a single blog post by ID."""
    post_data = await state.blog_svc.get_blog_post(_id)
    return APIResponse(
        data=post_data, message="Blog post retrieved successfully"
    )


@router.get("/tags")
@redis_cache(ttl=300, exclude=["state"])
async def get_tags(
    state: AppState = Depends(get_app_state),
):
    """Get all tags with post counts."""
    tags = await state.blog_svc.list_tags()

    return APIResponse(
        data={"tags": tags},
        message="Tags retrieved successfully",
    )


@router.get("/tags/{tag}/posts")
@redis_cache(ttl=120, exclude=["state"])
async def get_posts_by_tag(
    tag: Annotated[str, Path(..., description="Tag name")],
    page: int = 1,
    per_page: int = 10,
    state: AppState = Depends(get_app_state),
):
    """Get posts filtered by a single tag."""
    data = await state.blog_svc.get_posts_by_tag(
        tag,
        page=page,
        per_page=per_page,
    )
    return APIResponse(
        data=data,
        message=f"Posts tagged '{data['tag']}' retrieved successfully",
    )


# =============================================================================
# Post Management Endpoints have been moved to admin.py
# =============================================================================
