from __future__ import annotations

import base64
import json
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from email_validator import EmailNotValidError, validate_email
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Cookie,
    Depends,
    Request,
    Response,
    status,
)
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi_mail import FastMail, MessageSchema, MessageType, NameEmail
from pydantic import BaseModel, EmailStr, SecretStr
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from webauthn import options_to_json
from webauthn.authentication.verify_authentication_response import (
    VerifiedAuthentication,
)
from webauthn.helpers.structs import (
    PublicKeyCredentialCreationOptions,
    PublicKeyCredentialRequestOptions,
)
from webauthn.registration.verify_registration_response import (
    VerifiedRegistration,
)

from app.configs.config import settings
from app.configs.logger import logger
from app.dependencies.auth import manager
from app.dependencies.csrf import csrf_manager
from app.dependencies.database import get_session
from app.dependencies.limiter import limiter
from app.dependencies.mail import MailConfig
from app.dependencies.redis import AsyncRedis, get_async_redis
from app.models.models import PasskeyCredential, Profile, User
from app.schemas.response import APIResponse
from app.schemas.schemas import LoginIn, RegisterIn
from app.utils.security import generate_pkce_pair
from app.utils.webauthn import (
    generate_passkey_authentication_options,
    generate_passkey_registration_options,
    verify_passkey_authentication_response,
    verify_passkey_registration_response,
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


async def _login_user(
    user: User,
    request: Request,
    session: AsyncSession,
):
    """登录用户并更新登录信息."""
    if not user.active:
        user.active = True
    user.last_login_at = user.current_login_at
    user.current_login_at = datetime.now(UTC).replace(tzinfo=None)
    user.last_login_ip = user.current_login_ip
    # 获取用户ip
    user.current_login_ip = User.get_real_ip(request)
    user.login_count += 1

    await session.commit()


@router.get("/csrf-token", response_model=APIResponse)
async def csrf_token(response: Response):
    res: JSONResponse = APIResponse.ok(message="CSRF token 已生成")

    csrf_manager.set_csrf_cookie(res)
    return res


@router.get("/refresh-token")
async def refresh_token(
    request: Request,
    refresh_token: str = Cookie(None),
):
    """刷新访问令牌.

    Args:
        refresh_token: 刷新令牌(从Cookie中读取)
        或从请求体中读取

    Returns:
        API响应包含新的访问令牌
    """
    token = refresh_token or request.headers.get("refresh_token")
    if not token:
        return APIResponse.error(
            message="刷新令牌不存在",
            code=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        # 验证refresh token并获取用户
        user = await manager.get_current_user(token)
        if user is None:
            return APIResponse.error(
                message="用户不存在",
                code=status.HTTP_401_UNAUTHORIZED,
            )

        # 生成新的access token
        access_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(hours=12)
        )

        # 生成新的refresh token（滚动刷新策略，提升安全性）
        new_refresh_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(days=30)
        )

        response: JSONResponse = APIResponse.ok(
            message="访问令牌已刷新",
            code=status.HTTP_200_OK,
            data={"refresh_token": new_refresh_token},
        )
        manager.set_cookie(response=response, token=access_token)
        # 更新refresh token cookie
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            samesite="lax",
            secure=True,
        )
        csrf_manager.set_csrf_cookie(response)

        return response
    except Exception as e:
        logger.error(f"刷新令牌验证失败: {e!s}")
        return APIResponse.error(
            message="无效的刷新令牌或已过期",
            code=status.HTTP_401_UNAUTHORIZED,
        )


# 用户登录、注册和邮箱验证码相关接口
@router.post("/login", response_model=APIResponse)
@limiter.limit(limit_value="5/minute")
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
        .options(
            selectinload(User.profile), selectinload(User.passkey_credential)
        )
    )
    user: User | None = user_result.scalar_one_or_none()

    if user is None or not user.validate_password(password):
        return APIResponse.error(
            message="用户名或密码错误",
            code=status.HTTP_401_UNAUTHORIZED,
        )

    profile: Profile | None = user.profile

    if remember_me:
        access_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(days=7)
        )
        refresh_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(days=30)
        )
    else:
        access_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(hours=12)
        )
        refresh_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(days=7)
        )

    await _login_user(user=user, request=request, session=session)

    response: JSONResponse = APIResponse.ok(
        data={
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
            "name": user.name,
            "email": profile.email if profile else None,
            "gender": profile.gender if profile else None,
            "mobile": profile.mobile if profile else None,
            "photo": profile.photo if profile else None,
            "refresh_token": refresh_token,
            "has_passkey": bool(user.passkey_credential),
            "github_bound": bool(user.github_id),
        },
        message="登录成功",
    )

    manager.set_cookie(response=response, token=access_token)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=True,
    )
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
    response.delete_cookie(key="refresh_token")
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

    # 1. 重新查询用户，并显式加载 profile 和 passkey_credential
    result = await session.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(
            selectinload(User.profile), selectinload(User.passkey_credential)
        )
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
            "has_passkey": bool(user.passkey_credential),
            "github_bound": bool(user.github_id),
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


class PasskeyRegistrationRequest(BaseModel):
    response: dict


class PasskeyAuthenticationRequest(BaseModel):
    response: dict


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


#################### Passkey 相关接口 ####################


def base64url_encode(data: str | bytes) -> str:
    """Base64URL 编码移除填充符"""
    if isinstance(data, str):
        data = data.encode("utf-8")
    encoded = base64.urlsafe_b64encode(data).decode("ascii")
    return encoded.rstrip("=")  # 移除末尾的 =


def base64url_decode(encoded: str | bytes) -> str:
    """Base64URL 解码自动补全填充符"""
    if isinstance(encoded, str):
        # 补全 padding
        padding = 4 - len(encoded) % 4
        if padding != 4:
            encoded += "=" * padding
    decoded = base64.urlsafe_b64decode(encoded)
    return decoded.decode("utf-8")


@router.get("/passkey/registration-options")
async def passkey_registration_options(
    user: User = Depends(manager),
    session: AsyncSession = Depends(get_session),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """生成 Passkey 注册选项."""
    # 检查用户是否已经有passkey
    existing_credential = await session.execute(
        select(PasskeyCredential).where(PasskeyCredential.user_id == user.id)
    )
    if existing_credential.scalar_one_or_none():
        return APIResponse.error(
            message="您的账户已经绑定了Passkey",
            code=status.HTTP_400_BAD_REQUEST,
        )

    options: PublicKeyCredentialCreationOptions = (
        generate_passkey_registration_options(str(user.id))
    )

    challenge: str = base64url_encode(options.challenge)

    # 存储 challenge 到 Redis，5 分钟过期
    await redis.set(
        f"passkey:registration:challenge:{user.id}",
        challenge,
        ex=300,
    )
    return APIResponse.ok(
        data=json.loads(options_to_json(options)),
        message="Passkey 注册选项生成成功",
    )


@router.post("/passkey/register")
async def passkey_register(
    request: PasskeyRegistrationRequest,
    user: User = Depends(manager),
    session: AsyncSession = Depends(get_session),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """验证 Passkey 注册响应并绑定到用户."""
    # 检查用户是否已经有passkey
    existing_credential = await session.execute(
        select(PasskeyCredential).where(PasskeyCredential.user_id == user.id)
    )
    if existing_credential.scalar_one_or_none():
        return APIResponse.error(
            message="您的账户已经绑定了Passkey",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 从 Redis 获取预期的 challenge
    expected_challenge = await redis.get(
        f"passkey:registration:challenge:{user.id}"
    )
    if not expected_challenge:
        return APIResponse.error(
            message="Passkey 注册会话已过期或不存在",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 删除 challenge，防止重放攻击
    await redis.delete(f"passkey:registration:challenge:{user.id}")

    # 验证注册响应
    verification: VerifiedRegistration = verify_passkey_registration_response(
        request.response, expected_challenge
    )
    if not verification:
        return APIResponse.error(
            message="Passkey 注册验证失败", code=status.HTTP_400_BAD_REQUEST
        )

    # 将 Passkey 凭证信息保存到数据库（转换为Base64URL字符串存储）
    credential_id: str = base64url_encode(verification.credential_id)
    public_key: str = base64url_encode(verification.credential_public_key)

    credential = PasskeyCredential(
        user_id=user.id,
        credential_id=credential_id,
        public_key=public_key,
        sign_count=verification.sign_count,
    )
    session.add(credential)
    await session.commit()
    return APIResponse.ok(message="Passkey 注册成功")


@router.get("/passkey/authentication-options")
async def passkey_authentication_options(
    redis: AsyncRedis = Depends(get_async_redis),
):
    """生成 Passkey 认证选项."""
    options: PublicKeyCredentialRequestOptions = (
        generate_passkey_authentication_options()
    )

    challenge_bytes: bytes = options.challenge
    challenge: str = base64url_encode(challenge_bytes)

    # 存储 challenge 到 Redis，5 分钟过期
    await redis.set(
        f"passkey:authentication:challenge:{challenge}",
        challenge,
        ex=300,
    )
    # 使用 webauthn 官方方法序列化
    return APIResponse.ok(
        data=json.loads(options_to_json(options)),
        message="Passkey 认证选项生成成功",
    )


@router.delete("/passkey/delete")
async def passkey_delete(
    user: User = Depends(manager),
    session: AsyncSession = Depends(get_session),
):
    """删除用户绑定的 Passkey."""
    # 查找用户的passkey
    result = await session.execute(
        select(PasskeyCredential).where(PasskeyCredential.user_id == user.id)
    )
    credential = result.scalar_one_or_none()

    if not credential:
        return APIResponse.error(
            message="您的账户尚未绑定Passkey", code=status.HTTP_400_BAD_REQUEST
        )

    await session.delete(credential)
    await session.commit()

    return APIResponse.ok(message="Passkey 删除成功")


@router.post("/passkey/authenticate")
async def passkey_authenticate(
    http_request: Request,
    request: PasskeyAuthenticationRequest,
    session: AsyncSession = Depends(get_session),
    redis: AsyncRedis = Depends(get_async_redis),
):
    """验证 Passkey 认证响应并登录用户."""
    # 从响应中获取 clientDataJSON 并解码获取 challenge
    try:
        client_data_json_b64 = request.response["response"]["clientDataJSON"]
        # 解码 Base64URL 字符串
        client_data_json_bytes: bytes = base64url_decode(
            client_data_json_b64
        ).encode("utf-8")
        client_data = json.loads(client_data_json_bytes)
        challenge = client_data["challenge"]

    except KeyError, ValueError, json.JSONDecodeError:
        return APIResponse.error(
            message="无效的 Passkey 认证响应", code=status.HTTP_400_BAD_REQUEST
        )

    # 从 Redis 获取预期的 challenge
    expected_challenge = await redis.get(
        f"passkey:authentication:challenge:{challenge}"
    )
    if not expected_challenge:
        return APIResponse.error(
            message="Passkey 认证会话已过期或不存在",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 删除 challenge，防止重放攻击
    await redis.delete(f"passkey:authentication:challenge:{challenge}")

    # 从响应中获取 credential ID
    try:
        credential_id = request.response["id"]
    except KeyError:
        return APIResponse.error(
            message="无效的 Passkey 凭证 ID", code=status.HTTP_400_BAD_REQUEST
        )

    # 从数据库中查找对应的 Passkey 凭证
    result = await session.execute(
        select(PasskeyCredential)
        .where(PasskeyCredential.credential_id == credential_id)
        .options(
            selectinload(PasskeyCredential.user).selectinload(User.profile)
        )
    )
    credential: PasskeyCredential | None = result.scalar_one_or_none()
    if credential is None:
        return APIResponse.error(
            message="Passkey 凭证不存在", code=status.HTTP_400_BAD_REQUEST
        )

    user: User = credential.user
    if user is None:
        return APIResponse.error(
            message="用户不存在", code=status.HTTP_400_BAD_REQUEST
        )

    # 验证认证响应
    verification: VerifiedAuthentication = (
        verify_passkey_authentication_response(
            response=request.response,
            expected_challenge=expected_challenge,
            credential_public_key=credential.public_key,
            sign_count=credential.sign_count,
        )
    )
    if not verification:
        return APIResponse.error(
            message="Passkey 认证验证失败", code=status.HTTP_400_BAD_REQUEST
        )

    # 更新签名计数
    credential.sign_count = verification.new_sign_count

    # 更新用户登录信息（同常规登录）
    await _login_user(user=user, request=http_request, session=session)

    # 生成令牌并设置 Cookie（同常规登录）
    access_token = manager.create_access_token(
        data={"sub": str(user.id)}, expires=timedelta(hours=12)
    )
    refresh_token = manager.create_access_token(
        data={"sub": str(user.id)}, expires=timedelta(days=7)
    )

    profile = user.profile
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
            "has_passkey": True,
            "refresh_token": refresh_token,
            "github_bound": bool(user.github_id),
        },
        message="Passkey 登录成功",
    )

    manager.set_cookie(response=response, token=access_token)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=True,
    )
    csrf_manager.set_csrf_cookie(response)

    return response


class GitHubOAuthConfig(BaseModel):
    client_id: str
    client_secret: SecretStr
    redirect_uri: str
    state: str
    scope: str = "read:user user:email"
    code_challenge: str
    code_challenge_method: str = "S256"


@router.get("/github")
async def github_login(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """GitHub OAuth 登录."""
    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = generate_pkce_pair()

    # 将 state 和 code_verifier 存储在 session 中，稍后验证
    request.session["oauth_state"] = state
    request.session["code_verifier"] = code_verifier
    request.session["oauth_mode"] = "login"  # 标记为登录模式

    # 构建 GitHub 授权 URL
    github_config = GitHubOAuthConfig(
        client_id=settings.GITHUB_CLIENT_ID,
        client_secret=SecretStr(settings.GITHUB_CLIENT_SECRET),
        redirect_uri=settings.GITHUB_REDIRECT_URI,
        state=state,
        scope="read:user user:email",
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )
    auth_url = "https://github.com/login/oauth/authorize?" + urlencode(
        github_config.model_dump(exclude={"client_secret"})
    )

    return RedirectResponse(auth_url)


@router.get("/github/bind")
async def github_bind(
    request: Request,
    current_user: User = Depends(manager),
):
    """绑定 GitHub 账号到当前登录用户."""
    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = generate_pkce_pair()

    # 将 state 和 code_verifier 存储在 session 中，稍后验证
    request.session["oauth_state"] = state
    request.session["code_verifier"] = code_verifier
    request.session["oauth_mode"] = "bind"  # 标记为绑定模式

    # 构建 GitHub 授权 URL
    github_config = GitHubOAuthConfig(
        client_id=settings.GITHUB_CLIENT_ID,
        client_secret=SecretStr(settings.GITHUB_CLIENT_SECRET),
        redirect_uri=settings.GITHUB_REDIRECT_URI,
        state=state,
        scope="read:user user:email",
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )
    auth_url = "https://github.com/login/oauth/authorize?" + urlencode(
        github_config.model_dump(exclude={"client_secret"})
    )

    return RedirectResponse(auth_url)


@router.post("/github/unbind")
async def github_unbind(
    current_user: User = Depends(manager),
    session: AsyncSession = Depends(get_session),
):
    """解绑当前用户的 GitHub 账号."""
    # URL
    url = settings.FRONTEND_URL + "/settings?error=github_not_bound"
    if not current_user.github_id:
        return RedirectResponse(url=url)

    current_user.github_id = None
    await session.commit()
    return RedirectResponse(
        url=settings.FRONTEND_URL + "/settings?success=github_unbound"
    )


async def find_or_create_user(
    session: AsyncSession,
    github_id: int,
    username: str,
    email: str,
    avatar_url: str | None = None,
) -> User:
    """根据 GitHub ID 查找或创建用户."""
    result = await session.execute(
        select(User)
        .where(User.github_id == github_id)
        .options(
            selectinload(User.profile), selectinload(User.passkey_credential)
        )
    )
    user: User | None = result.scalar_one_or_none()
    if user:
        return user

    # 检查用户名是否已存在，避免冲突
    existing_user = await session.execute(
        select(User).where(User.username == username)
    )
    if existing_user.scalar_one_or_none():
        # 如果用户名已存在，添加随机后缀
        username = f"{username}_{secrets.token_urlsafe(4)}"

    # 创建新用户 - 不手动指定id，让数据库自增
    new_user = User(
        username=username,
        github_id=github_id,
        raw_password=secrets.token_urlsafe(
            16
        ),  # 随机密码，用户无法使用密码登录
        name=username,
    )
    session.add(new_user)
    await session.flush()  # 刷新获取自增的 user.id

    # 创建关联的 Profile
    profile = Profile(
        user_id=new_user.id,
        email=email,
        photo=avatar_url or "default.png",
    )
    session.add(profile)

    # 提交后刷新用户对象，确保关系正确加载
    await session.commit()
    await session.refresh(new_user, ["profile", "passkey_credential"])

    return new_user


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str,
    state: str,
    session: AsyncSession = Depends(get_session),
):
    """处理 GitHub OAuth 回调."""
    # 验证 state 和 code_verifier
    if state != request.session.get("oauth_state"):
        return RedirectResponse(
            url=settings.FRONTEND_URL + "/login?error=invalid_oauth_state"
        )

    code_verifier = request.session.pop("code_verifier")
    if not code_verifier:
        return RedirectResponse(
            url=settings.FRONTEND_URL + "/login?error=missing_pkce_info"
        )

    # 交换access_token
    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.GITHUB_REDIRECT_URI,
                    "code_verifier": code_verifier,
                },
                headers={"Accept": "application/json"},
                timeout=10.0,
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()
    except httpx.ReadTimeout:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_timeout"
        )
    except httpx.HTTPStatusError, ValueError:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_auth_failed"
        )

    if "error" in token_data:
        error_msg = token_data.get("error_description", "github_auth_failed")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={error_msg}"
        )

    access_token = token_data["access_token"]

    # 获取用户信息
    try:
        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            user_resp.raise_for_status()
            github_user = user_resp.json()
    except httpx.ReadTimeout:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_timeout"
        )
    except httpx.HTTPStatusError, ValueError:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_user_info_failed"
        )

    github_id = github_user["id"]
    username = github_user["login"]
    email = github_user.get("email") or f"{username}@github.com"
    avatar_url = github_user.get("avatar_url")

    # 获取 OAuth 模式，默认为登录模式
    oauth_mode = request.session.pop("oauth_mode", "login")

    if oauth_mode == "bind":
        # 绑定模式：将 GitHub 账号绑定到当前登录用户
        try:
            current_user = await manager(request)
        except Exception:
            return RedirectResponse(
                url=settings.FRONTEND_URL + "/settings?error=not_logged_in"
            )

        # 重新在当前session中查询用户并预加载profile关系
        result = await session.execute(
            select(User)
            .where(User.id == current_user.id)
            .options(selectinload(User.profile))
        )
        current_user = result.scalar_one()

        # 检查该 GitHub 账号是否已被其他用户绑定
        existing_user = await session.execute(
            select(User).where(User.github_id == github_id)
        )
        if existing_user.scalar_one_or_none():
            return RedirectResponse(
                url=settings.FRONTEND_URL
                + "/settings?error=github_already_bound"
            )

        # 绑定到当前用户
        current_user.github_id = github_id

        # 如果用户没有头像，使用 GitHub 头像
        if current_user.profile and not current_user.profile.photo:
            current_user.profile.photo = avatar_url

        await session.commit()
        return RedirectResponse(
            url=settings.FRONTEND_URL + "/settings?success=github_bound"
        )
    else:
        # 登录模式：先尝试通过邮箱匹配现有用户（可选功能）
        # 检查 GitHub 邮箱是否已被注册
        existing_user_by_email = None
        if email and not email.endswith("@github.com"):
            result = await session.execute(
                select(User)
                .join(Profile)
                .where(Profile.email == email)
                .options(
                    selectinload(User.profile),
                    selectinload(User.passkey_credential),
                )
            )
            existing_user_by_email = result.scalar_one_or_none()

        # 如果邮箱匹配且用户尚未绑定 GitHub，自动绑定
        if existing_user_by_email and not existing_user_by_email.github_id:
            existing_user_by_email.github_id = github_id
            if (
                existing_user_by_email.profile
                and not existing_user_by_email.profile.photo
            ):
                existing_user_by_email.profile.photo = avatar_url
            await session.commit()
            user = existing_user_by_email
        else:
            # 否则查找或创建用户
            user: User = await find_or_create_user(
                session,
                github_id=github_id,
                username=username,
                email=email,
                avatar_url=avatar_url,
            )

        await _login_user(user=user, request=request, session=session)
        # 生成令牌并设置 Cookie（同常规登录）
        access_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(hours=12)
        )
        refresh_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(days=7)
        )
        response = RedirectResponse(url=settings.FRONTEND_URL)
        manager.set_cookie(response=response, token=access_token)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            samesite="lax",
            secure=True,
        )
        csrf_manager.set_csrf_cookie(response)

        return response
