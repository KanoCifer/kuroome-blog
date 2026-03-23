from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import subprocess
from datetime import UTC, datetime

from beanie import SortDirection
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from redis.asyncio import Redis as AsyncRedis
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.configs import get_settings
from app.configs.logger import logger
from app.dependencies.auth import manager
from app.dependencies.database import get_session
from app.dependencies.redis import get_redis
from app.models.mgmodel import MessageBoard, Post
from app.models.models import Category, User
from app.schemas import VisitorData
from app.schemas.response import APIResponse
from app.schemas.schemas import BlogPostIn, BlogPostUpdate
from app.tasks import send_feishu_message
from app.utils import get_redis_lock, redis_cache

router = APIRouter(prefix="/admin", tags=["admin"])


# =============================================================================
# Admin Dependency - Reusable admin check
# =============================================================================
async def get_admin_user(current_user: User = Depends(manager)) -> User:
    """Dependency to ensure user is admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# =============================================================================
# Blog Post Management Endpoints
# =============================================================================


@router.post("/post/add")
async def add_post(
    data: BlogPostIn,
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    """Add a new blog post (admin only)."""
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

    post_data = Post(
        title=title,
        body=body,
        category_id=category_id,
        is_pinned=is_pinned,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    result = await Post.insert_one(post_data)
    if not result or not result.id:
        return APIResponse.error(
            message="Failed to add blog post请稍后再试",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    new_id = result.id

    await redis_cache.clear()
    return APIResponse.ok(
        data={"_id": str(new_id)},
        message="Blog post added successfully",
    )


@router.put("/post/update")
async def update_post(
    data: BlogPostUpdate,
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    """Update an existing blog post (admin only)."""
    post_id = data.id
    title = data.title
    body = data.body
    category_id = data.category_id
    is_pinned = data.is_pinned

    try:
        oid = ObjectId(post_id)
    except InvalidId:
        return APIResponse.error(
            message="非法的博客ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # Check if post exists
    existing_post = await Post.find_one(Post.id == oid)
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
    await Post.find_one(Post.id == oid).set(
        {
            "title": title,
            "body": body,
            "category_id": category_id,
            "is_pinned": is_pinned,
            "updated_at": datetime.now(UTC),
        }
    )
    try:
        await redis_cache.clear()
    except Exception as e:
        logger.error(f"Failed to clear cache after updating post: {e!s}")
    return APIResponse.ok(
        data={"_id": post_id},
        message="Blog post updated successfully",
    )


@router.delete("/post/{post_id}/delete")
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_admin_user),
):
    """Delete a blog post (admin only)."""

    try:
        oid = ObjectId(post_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid blog post ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # Check if post exists
    existing_post = await Post.find_one(Post.id == oid)
    if not existing_post:
        return APIResponse.error(
            message="Blog post not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    try:
        await Post.find_one(Post.id == oid).delete()
        logger.info(
            f"Blog post with ID {post_id} deleted by admin {current_user.username}"
        )
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to delete blog post: {e!s}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    await redis_cache.clear()
    return APIResponse.ok(
        data={"_id": post_id},
        message="Blog post deleted successfully",
    )


# =============================================================================
# Comment Management Endpoints
# =============================================================================


@router.get("/comments")
async def get_admin_comments(
    current_user: User = Depends(get_admin_user),
):
    """Get all comments (pending and approved) for admin review."""
    pending: list[dict] = []
    approved: list[dict] = []

    # Iterate all posts and collect comments
    cursor = (
        Post.find().sort([("created_at", SortDirection.DESCENDING)]).limit(100)
    )  # Only check last 100 posts for performance
    async for post in cursor:
        post_id_str = str(post.id)
        post_title = post.title or "Untitled"

        for comment in post.comments:
            comment_data = {
                "_id": str(comment.id),
                "post_id": post_id_str,
                "post_title": post_title,
                "author": comment.author or "Anonymous",
                "email": comment.email or "",
                "body": comment.body or "",
                "site": comment.site or "",
                "from_admin": comment.from_admin or False,
                "reviewed": comment.reviewed or False,
                "replied_id": str(comment.replied_id)
                if comment.replied_id
                else None,
                "created_at": comment.created_at
                if comment.created_at
                else None,
            }

            if comment.reviewed:
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


@router.post("/comments/{comment_id}/approve")
async def approve_comment(
    comment_id: str,
    current_user: User = Depends(get_admin_user),
):
    """Approve a pending comment (admin only)."""
    try:
        obj_id = ObjectId(comment_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid comment ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        await Post.find_one({"comments._id": obj_id}).update(
            {"$set": {"comments.$[com].reviewed": True}},
            array_filters=[{"com._id": obj_id}],
        )  # type: ignore
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to approve comment: {e!s}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    await redis_cache.clear()
    return APIResponse.ok(message="Comment approved successfully")


@router.delete("/comments/{comment_id}/delete")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_admin_user),
):
    """Delete a comment (admin only)."""
    try:
        obj_id = ObjectId(comment_id)
    except InvalidId:
        return APIResponse.error(
            message="Invalid comment ID",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # Remove the comment from the array
    result = await Post.find_one({"comments._id": obj_id}).update(
        {"$pull": {"comments": {"_id": obj_id}}},
    )  # type: ignore

    if result.modified_count == 0:
        return APIResponse.error(
            message="Comment not found",
            code=status.HTTP_404_NOT_FOUND,
        )

    await redis_cache.clear()
    return APIResponse.ok(message="Comment deleted successfully")


# =============================================================================
# Message Board Management Endpoints
# =============================================================================


@router.get("/messages", response_model=APIResponse)
async def get_admin_messages(
    current_user: User = Depends(get_admin_user),
):
    """Get all messages (pending and approved) for admin review."""
    try:
        # Get pending messages (review = 0)
        pending_messages: list[MessageBoard] = (
            await MessageBoard.find({"review": 0})
            .sort([("created_at", SortDirection.DESCENDING)])
            .to_list()
        )

        # Get approved messages (review = 1), limit to 50
        approved_messages: list[MessageBoard] = (
            await MessageBoard.find({"review": 1})
            .sort([("created_at", SortDirection.DESCENDING)])
            .limit(50)
            .to_list()
        )

        def format_message(msg: MessageBoard) -> dict:
            return {
                "id": str(msg.id),
                "name": msg.name,
                "message": msg.message,
                "created_at": (msg.created_at),
                "review": msg.review if hasattr(msg, "review") else 0,
            }

        return APIResponse.ok(
            data={
                "pending": [format_message(msg) for msg in pending_messages],
                "approved": [format_message(msg) for msg in approved_messages],
            },
            message="Messages retrieved successfully",
        )
    except Exception as e:
        return APIResponse(
            status="error",
            message=f"Failed to retrieve messages: {e!s}",
            code=500,
        )


@router.post("/messages/{message_id}/approve")
async def approve_message(
    message_id: str,
    current_user: User = Depends(get_admin_user),
):
    """Approve a pending message (admin only)."""
    try:
        obj_id = ObjectId(message_id)
    except Exception:
        return APIResponse(
            status="error", message="Invalid message ID.", code=400
        )

    try:
        msg = await MessageBoard.get(obj_id)
        if not msg:
            return APIResponse(
                status="error", message="Message not found.", code=404
            )
        msg.review = 1
        await msg.save()
        return APIResponse.ok(message="Message has been approved.")
    except Exception:
        return APIResponse.error(
            message="Failed to approve message.",
            code=500,
        )


@router.delete("/messages/{message_id}/delete")
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_admin_user),
):
    """Delete a message (admin only)."""
    try:
        obj_id = ObjectId(message_id)
    except Exception:
        return APIResponse.error(message="Invalid message ID.", code=400)

    try:
        # Delete the message directly
        await MessageBoard.find(MessageBoard.id == obj_id).delete()
        await redis_cache.clear()
        return APIResponse.ok(message="Message has been deleted.")
    except Exception as e:
        return APIResponse.error(
            message=f"Failed to delete message: {e!s}",
            code=500,
        )


@router.post("/track")
async def track_visitor(
    data: VisitorData,
    request: Request,
    session: AsyncSession = Depends(get_session),
    redis: AsyncRedis = Depends(get_redis),
):
    """Track visitor data sent from the frontend."""
    ip_address = get_remote_address(request)
    visitor_data = VisitorData(
        **data.model_dump(exclude={"ip_address"}),
        ip_address=ip_address,
    )
    try:
        await redis.rpush(
            "migration_queue", json.dumps(visitor_data.model_dump(mode="json"))
        )  # type: ignore
        return Response(status_code=204)
    except Exception as e:
        logger.error(f"Failed to track visitor data: {e!s}")
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Webhook Deploy Endpoint
# =============================================================================
async def run_deployment() -> None:
    """异步执行部署脚本不阻塞HTTP请求"""
    try:
        logger.info("启动自动化部署...")
        import time

        start_time = time.time()
        # 部署脚本路径，根据你的实际情况修改
        deploy_script = "/home/kano/blog/backend/deploy.sh"

        if not os.path.exists(deploy_script):  # noqa: PTH110
            logger.error(f"Deploy script not found at {deploy_script}")
            return

        # 执行部署脚本，捕获输出
        process = await asyncio.create_subprocess_exec(
            deploy_script,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd="/home/kano/blog/backend",  # 设置工作目录为项目根目录
        )

        stdout, stderr = await process.communicate()

        if process.returncode == 0:
            end_time: float = time.time()
            elapsed_time: float = end_time - start_time
            logger.info(f"✅自动化部署完成，耗时 {elapsed_time:.2f} 秒")
            logger.debug(f"✅Deploy output: {stdout.decode()}")
        else:
            logger.error(f"❌自动化部署失败，退出码: {process.returncode}")
            logger.error(f"STDOUT: {stdout.decode()}")
            logger.error(f"STDERR: {stderr.decode()}")

    except Exception as e:
        logger.error(f"Deployment process failed: {e!s}")


@router.post("/deploy")
async def webhook_deploy(
    request: Request,
    redis: AsyncRedis = Depends(get_redis),
):
    """
    Gitee Webhook 自动部署接口
    """
    # 从环境变量获取webhook密钥，需要在.env中配置
    webhook_secret: str | None = get_settings().GITEE_WEBHOOK_SECRET
    if not webhook_secret:
        logger.error(
            "GITEE_WEBHOOK_SECRET is not set in environment variables"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook secret not configured",
        )

    # 获取Gitee发送的签名头
    gitee_token: str | None = request.headers.get("X-Gitee-Token")
    signature_header: str | None = request.headers.get("X-Hub-Signature-256")

    # 验证方式1：简单token验证（Gitee Webhook的"密码"字段）
    if gitee_token:
        if not hmac.compare_digest(gitee_token, webhook_secret):
            logger.warning(
                f"Invalid X-Gitee-Token from {get_remote_address(request)}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid token",
            )
    # 验证方式2：SHA256签名验证（更安全）
    elif signature_header:
        # 获取请求体
        body = await request.body()

        # 计算签名
        expected_signature = hmac.new(
            webhook_secret.encode(), body, hashlib.sha256
        ).hexdigest()

        # 比较签名，Gitee的签名格式是 sha256=xxxxxx
        if not signature_header.startswith("sha256="):
            logger.warning(
                f"Invalid signature format from {get_remote_address(request)}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid signature format",
            )

        received_signature = signature_header.split("=", 1)[1]
        if not hmac.compare_digest(received_signature, expected_signature):
            logger.warning(
                f"Invalid signature from {get_remote_address(request)}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid signature",
            )
    else:
        logger.warning(
            f"No authentication headers from {get_remote_address(request)}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication provided",
        )

    # 验证通过，触发异步部署
    logger.info(
        f"Deployment triggered by webhook from {get_remote_address(request)}"
    )

    try:
        async with get_redis_lock(redis, "deploy_lock", ttl=300):
            logger.info(
                f"Deployment triggered by webhook from {get_remote_address(request)}"
            )
            await send_feishu_message.kiq("API服务正在部署中，请稍候...")
            asyncio.create_task(run_deployment())  # noqa: RUF006
            return APIResponse.ok(
                message="Deployment triggered successfully",
                data={"status": "pending"},
            )
    except Exception as e:
        if "无法获取锁" in str(e):
            logger.info("Deployment already in progress, skipping")
            return APIResponse.ok(
                message="Deployment already in progress",
                data={"status": "in_progress"},
            )
        logger.error(f"Failed to trigger deployment: {e!s}")
        return APIResponse.error(
            message="Failed to trigger deployment",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
