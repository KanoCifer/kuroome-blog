"""Authentication router for FastAPI.

This module provides authentication endpoints migrated from
backend/watchlist/api/auth.py to FastAPI.

Endpoints:
    - POST /api/auth/login - Login with username/password
    - POST /api/auth/logout - Logout current user
    - GET /api/auth/me - Get current user info
    - GET /api/auth/csrf-token - Get CSRF token
    - POST /api/auth/register - Register new user
    - POST /api/auth/email/code - Send email verification code
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from email_validator import EmailNotValidError, validate_email
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Request,
    Response,
    status,
)
from fastapi.responses import JSONResponse
from fastapi_mail import FastMail, MessageSchema, MessageType, NameEmail
from pydantic import BaseModel, EmailStr
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.configs.logger import logger
from app.dependencies.auth import manager
from app.dependencies.csrf import csrf_manager
from app.dependencies.database import get_session
from app.dependencies.limiter import limiter
from app.dependencies.mail import MailConfig
from app.dependencies.redis import AsyncRedis, get_async_redis
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import LoginIn, RegisterIn

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.get("/csrf-token", response_model=APIResponse)
async def csrf_token(response: Response):
    res: JSONResponse = APIResponse.ok(message="CSRF token 已生成")

    csrf_manager.set_csrf_cookie(res)
    return res


# 速率限制器，限制登录接口每分钟最多5次请求


# 用户登录、注册和邮箱验证码相关接口
@router.post("/login", response_model=APIResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: LoginIn,
    session: AsyncSession = Depends(get_session),
):
    """用户登录.

    Args:
        request: FastAPI request object containing session
        data: Login input data with username, password, remember_me
        db: Database session

    Returns:
        API response with user data (id, username, is_admin) or error
    """
    username: str = data.username
    password: str = data.password
    remember_me: bool = data.remember_me

    # 从数据库中查询用户信息
    user_result = await session.execute(
        select(User)
        .where(User.username == username)
        .options(selectinload(User.profile))
    )
    user = user_result.scalar_one_or_none()

    if user is None or not user.validate_password(password):
        return APIResponse.error(
            message="用户名或密码错误",
            code=status.HTTP_401_UNAUTHORIZED,
        )

    profile = user.profile

    if remember_me:
        access_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(days=7)
        )
    else:
        access_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(hours=12)
        )

    # Track login info
    user.active = True
    user.last_login_at = user.current_login_at
    user.current_login_at = datetime.now(UTC).replace(tzinfo=None)
    user.last_login_ip = user.current_login_ip
    # 获取用户ip
    user.current_login_ip = User.get_real_ip(request)
    user.login_count += 1

    await session.commit()

    response = APIResponse.ok(
        data={
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
            "name": user.name,
            "email": profile.email if profile else None,
            "gender": profile.gender if profile else None,
            "mobile": profile.mobile if profile else None,
            "photo": profile.photo if profile else None,
        },
        message="登录成功",
        # access_token=access_token,
    )

    manager.set_cookie(response=response, token=access_token)
    csrf_manager.set_csrf_cookie(response)

    return response


@router.post("/logout", response_model=APIResponse)
async def logout(
    user: User = Depends(manager),
    session: AsyncSession = Depends(get_session),
):
    """退出登录.

    Args:
        request: FastAPI request object
        user: Current authenticated user
        session: Database session

    Returns:
        API response with success message
    """
    # Set user as inactive

    user.active = False
    await session.commit()

    # Clear session
    response = APIResponse.ok(
        message="已退出登录",
        code=status.HTTP_200_OK,
    )
    response.delete_cookie(key=manager.cookie_name)
    return response


# 查询当前用户信息接口
@router.get("/me")
async def me(
    current_user: User = Depends(manager),
    session: AsyncSession = Depends(get_session),
):
    """获取当前登录用户信息.

    Args:
        current_user: Current authenticated user
        session: Database session

    Returns:
        API response with complete user info including profile
    """

    from sqlalchemy.orm import selectinload

    from app.models.models import Profile

    # 1. 重新查询用户，并显式加载 profile
    result = await session.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.profile))
    )
    user = result.scalar_one()
    if not user.profile:
        profile = Profile(user_id=user.id)
        session.add(profile)
        await session.commit()
        await session.refresh(user)

    profile = user.profile
    return APIResponse.ok(
        data={
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
            "name": user.name,
            "email": profile.email if profile else None,
            "gender": profile.gender if profile else None,
            "mobile": profile.mobile if profile else None,
            "photo": profile.photo if profile else None,
        },
        message="获取用户信息成功",
        code=status.HTTP_200_OK,
    )


# 用户注册和邮箱验证码相关接口
@router.post("/register")
async def register(
    data: RegisterIn,
    session: AsyncSession = Depends(get_session),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """用户注册.

    Args:
        data: Registration input with username, password, email, email_code
        session: Database session
        redis: AsyncRedis instance
    Returns:
        API response with user data or error
    """
    from app.models.models import Profile

    username = data.username
    password = data.password
    email = data.email
    email_code = data.email_code

    # Check if username exists
    result = await session.execute(
        select(User).where(User.username == username)
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        return APIResponse.error(
            message="用户名已存在",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # Check if email already has a profile (optional, depending on your requirements)
    result = await session.execute(
        select(Profile).where(Profile.email == email)
    )
    existing_profile = result.scalar_one_or_none()
    if existing_profile:
        return APIResponse.error(
            message="邮箱已注册",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 验证邮箱验证码
    code_key = f"signup_code:{email}"
    stored_code = await redis.get(code_key)
    if stored_code is None or stored_code != email_code:
        return APIResponse.error(
            message="无效的邮箱或验证码",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # Create new user
    new_user = User(username=username)
    new_user.raw_password = password
    await session.flush()

    # Create profile
    new_profile = Profile(user_id=new_user.id)
    new_profile.email = email
    new_profile.photo = "default.png"

    await session.commit()

    return APIResponse.ok(
        data={
            "id": new_user.id,
            "username": new_user.username,
            "is_admin": new_user.is_admin,
        },
        message="注册成功",
        code=status.HTTP_201_CREATED,
    )


class EmailSchema(BaseModel):
    email: EmailStr


async def _send_email_code(
    email: str,
    verification_code: str,
):
    html = f"""<p>这是您的验证码：</p>
<h2 style=\"color: blue;\">{verification_code}</h2>
<p>请在10分钟内使用。</p>
"""
    # NameEmail 可以接收 name 和 email，如果没有 name，可以留空或填邮箱
    recipients = [NameEmail(email=email, name="")]  # type: ignore
    message = MessageSchema(
        subject="ReadingList 注册验证码",
        recipients=recipients,
        body=html,
        subtype=MessageType.html,
    )
    fm = FastMail(MailConfig.conf)

    try:
        await fm.send_message(message)
    except Exception as e:
        logger.error(f"发送验证码邮件失败: {e!s}")
        raise e


@router.post("/email/code")
async def send_email_code(
    email: EmailSchema,
    background_tasks: BackgroundTasks,
    redis: AsyncRedis = Depends(get_async_redis),
):
    """发送邮箱验证码."""
    email = email.email  # type: ignore
    try:
        emailinfo = validate_email(email, check_deliverability=True)  # type: ignore

        email = emailinfo.normalized  # type: ignore
    except EmailNotValidError as e:
        return APIResponse.error(
            message=f"邮箱格式无效: {e!s}",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 生成6位随机验证码
    import random

    code = [random.choice("012345678901234567890123456789") for _ in range(6)]
    verification_code = "".join(code)

    # 将验证码存储到redis中，并设置过期时间（10分钟）
    try:
        await redis.set(f"signup_code:{email}", verification_code, ex=600)
    except RedisError as e:
        return APIResponse.error(
            message=f"验证码存储失败: {e!s}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    try:
        # 将发送邮件的任务添加到后台任务中
        background_tasks.add_task(
            _send_email_code,
            email=email,  # type: ignore
            verification_code=verification_code,  # type: ignore
        )
    except Exception as e:
        return APIResponse.error(
            message=f"验证码发送失败: {e!s}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return APIResponse.ok(
        message="验证码发送成功，请检查您的邮箱！",
        code=status.HTTP_202_ACCEPTED,
    )
