from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import subprocess

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from redis.asyncio import Redis as AsyncRedis
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.des.auth import get_admin_user
from app.api.des.db import get_session
from app.api.des.des import admin_service_dep
from app.api.des.redis import get_redis
from app.core import get_settings
from app.core.logger import logger
from app.models.models import User
from app.schemas import VisitorData
from app.schemas.response import APIResponse
from app.schemas.schemas import BlogPostIn, BlogPostUpdate
from app.services.admin_service import AdminDomainError, AdminService
from app.tasks import send_feishu_message
from app.utils import get_redis_lock

router = APIRouter(prefix="/admin", tags=["admin"])

# =============================================================================
# Blog Post Management Endpoints
# =============================================================================


@router.post("/post/add")
async def add_post(
    data: BlogPostIn,
    current_user: User = Depends(get_admin_user),
    admin_service: AdminService = Depends(admin_service_dep),
):
    try:
        new_id = await admin_service.add_post(
            title=data.title,
            body=data.body,
            category_id=data.category_id,
            is_pinned=data.is_pinned,
        )
    except AdminDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data={"_id": new_id},
        message="Blog post added successfully",
    )


@router.put("/post/update")
async def update_post(
    data: BlogPostUpdate,
    current_user: User = Depends(get_admin_user),
    admin_service: AdminService = Depends(admin_service_dep),
):
    try:
        await admin_service.update_post(
            post_id=data.id,
            title=data.title,
            body=data.body,
            category_id=data.category_id,
            is_pinned=data.is_pinned,
        )
    except AdminDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data={"_id": data.id},
        message="Blog post updated successfully",
    )


@router.delete("/post/{post_id}/delete")
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_admin_user),
    admin_service: AdminService = Depends(admin_service_dep),
):
    try:
        await admin_service.delete_post(post_id=post_id)
        logger.info(
            f"Blog post with ID {post_id} deleted by admin {current_user.username}"
        )
    except AdminDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

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
    admin_service: AdminService = Depends(admin_service_dep),
):
    payload = await admin_service.get_admin_comments()

    return APIResponse.ok(
        data=payload,
        message="Comments retrieved successfully",
    )


@router.post("/comments/{comment_id}/approve")
async def approve_comment(
    comment_id: str,
    current_user: User = Depends(get_admin_user),
    admin_service: AdminService = Depends(admin_service_dep),
):
    try:
        await admin_service.approve_comment(comment_id=comment_id)
    except AdminDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(message="Comment approved successfully")


@router.delete("/comments/{comment_id}/delete")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_admin_user),
    admin_service: AdminService = Depends(admin_service_dep),
):
    try:
        await admin_service.delete_comment(comment_id=comment_id)
    except AdminDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(message="Comment deleted successfully")


# =============================================================================
# Message Board Management Endpoints
# =============================================================================


@router.get("/messages", response_model=APIResponse)
async def get_admin_messages(
    current_user: User = Depends(get_admin_user),
    admin_service: AdminService = Depends(admin_service_dep),
):
    try:
        payload = await admin_service.get_admin_messages()
    except AdminDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    return APIResponse.ok(
        data=payload,
        message="Messages retrieved successfully",
    )


@router.post("/messages/{message_id}/approve")
async def approve_message(
    message_id: str,
    current_user: User = Depends(get_admin_user),
    admin_service: AdminService = Depends(admin_service_dep),
):
    try:
        await admin_service.approve_message(message_id=message_id)
    except AdminDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    return APIResponse.ok(message="Message has been approved.")


@router.delete("/messages/{message_id}/delete")
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_admin_user),
    admin_service: AdminService = Depends(admin_service_dep),
):
    try:
        await admin_service.delete_message(message_id=message_id)
    except AdminDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)
    return APIResponse.ok(message="Message has been deleted.")


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
            "app:migration_queue",
            json.dumps(visitor_data.model_dump(mode="json")),
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
