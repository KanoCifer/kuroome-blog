from __future__ import annotations

from typing import Annotated

from email_validator import EmailNotValidError, ValidatedEmail, validate_email
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import JSONResponse, RedirectResponse
from webauthn.helpers import options_to_json_dict

from app.api.des.auth import (
    get_current_user_full,
    manager,
    resolve_user_from_token,
)
from app.api.des.des import user_service_dep, user_services_dep
from app.api.des.limiter import limiter
from app.api.des.redis import AsyncRedis, get_redis
from app.core.config import settings
from app.core.container import UserServices
from app.core.exceptions import APIError, GitHubAuthError
from app.core.logger import logger
from app.core.response import APIResponse, envelope_response
from app.models.models import User
from app.plugins.task import send_code
from app.schemas.auth import (
    EmailSchema,
    PasskeyAuthRequest,
    PasskeyRegistrationRequest,
)
from app.schemas.schemas import LoginIn, RegisterIn, UserSettingsIn
from app.services.user import UserService

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


# ------------------------------------------------------------------ #
# Helpers
# ------------------------------------------------------------------ #


def _build_login_response(
    data: dict,
    access_token: str,
    refresh_token: str,
    message: str = "登录成功",
) -> JSONResponse:
    """Build a login JSONResponse with auth cookies set.

    data is assembled by UserService.build_login_data() — this function
    only handles HTTP presentation concerns (cookies, response envelope).
    """
    data["access_token"] = access_token
    response: JSONResponse = envelope_response(data=data, message=message)
    cookie_domain = settings.COOKIE_DOMAIN
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="strict",
        secure=True,
        domain=cookie_domain or None,
    )
    return response


# ------------------------------------------------------------------ #
# Auth endpoints
# ------------------------------------------------------------------ #


@router.get("/refresh-token")
async def refresh_token(
    request: Request,
    refresh_token: str = Cookie(None),
    user_service: UserService = Depends(user_service_dep),
    redis: AsyncRedis = Depends(get_redis),
) -> JSONResponse:
    """使用刷新令牌获取新的访问令牌。刷新令牌可以来自 Cookie 或请求头。

    param:
        refresh_token: 来自 Cookie 的刷新令牌
    """
    token: str | None = refresh_token or request.headers.get("refresh_token")
    if not token:
        raise APIError(
            message="刷新令牌不存在",
            code=status.HTTP_401_UNAUTHORIZED,
        )

    result = await user_service.refresh_user_token(token, redis)
    if result is None:
        raise APIError(
            message="无效的刷新令牌或已过期",
            code=status.HTTP_401_UNAUTHORIZED,
        )
    _, tokens = result

    response: JSONResponse = envelope_response(
        message="访问令牌已刷新",
        data={
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
        },
    )
    cookie_domain = settings.COOKIE_DOMAIN
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        samesite="strict",
        secure=True,
        domain=cookie_domain or None,
    )
    return response


@router.post("/login")
@limiter.limit(limit_value="5/minute")
async def login(
    request: Request,
    data: LoginIn,
    user_service: UserService = Depends(user_service_dep),
    redis: AsyncRedis = Depends(get_redis),
) -> JSONResponse:
    """使用用户名和密码登录，成功后返回访问令牌和刷新令牌。

    param:
        data: 包含 username 和 password 的请求体
        user_service: 用户服务实例
    """
    user: User | None = await user_service.authenticate_user(
        data.username, data.password
    )

    if user is None:
        raise APIError(
            message="用户名或密码错误",
            code=status.HTTP_401_UNAUTHORIZED,
        )

    await user_service.record_login(user, request)
    tokens = await user_service.create_tokens(user, redis)
    login_data = user_service.build_login_data(user, tokens["refresh_token"])
    return _build_login_response(
        login_data, tokens["access_token"], tokens["refresh_token"]
    )


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user_full),
    user_service: UserService = Depends(user_service_dep),
    redis: AsyncRedis = Depends(get_redis),
):
    await user_service.logout(user, redis)

    cookie_domain = settings.COOKIE_DOMAIN
    response = envelope_response(
        message="已退出登录",
    )
    response.delete_cookie(key="refresh_token", domain=cookie_domain or None)
    return response


@router.put("/settings")
async def update_user_settings(
    data: UserSettingsIn,
    user: User = Depends(get_current_user_full),
    user_service: UserService = Depends(user_service_dep),
):
    try:
        result = await user_service.update_settings(user, data)
    except Exception:
        raise APIError(
            message="Username already exists.",
            code=status.HTTP_400_BAD_REQUEST,
        ) from None

    return APIResponse(
        data=result,
        message="Profile updated successfully.",
    )


@router.put("/upload-pic")
async def upload_avatar(
    image: Annotated[UploadFile, File()],
    user: User = Depends(get_current_user_full),
    user_service: UserService = Depends(user_service_dep),
):
    result = await user_service.upload_avatar(user, image)

    return APIResponse(
        data=result,
        message="Avatar uploaded successfully.",
    )


@router.get("/me")
async def me(
    current_user: int = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
):
    result = await user_service.get_user_with_profile(current_user)
    if result is None:
        raise APIError(
            message="用户不存在",
            code=status.HTTP_404_NOT_FOUND,
        )
    user, profile = result
    return APIResponse(
        data=user_service.user_to_dict(user, profile),
        message="获取用户信息成功",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterIn,
    redis: AsyncRedis = Depends(get_redis),
    user_service: UserService = Depends(user_service_dep),
):
    user = await user_service.register_user(
        username=data.username,
        password=data.password,
        email=data.email,
        email_code=data.email_code,
        redis=redis,
    )
    if user is None:
        raise APIError(
            message="用户名已存在或邮箱已注册或验证码无效",
            code=status.HTTP_400_BAD_REQUEST,
        )

    return APIResponse(
        data={
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
        },
        message="注册成功",
    )


@router.post("/email/code")
async def send_email_code(
    email: EmailSchema,
    redis: AsyncRedis = Depends(get_redis),
    user_service: UserService = Depends(user_service_dep),
):
    email_addr = email.email
    try:
        emailinfo: ValidatedEmail = validate_email(
            email_addr,
            check_deliverability=True,
        )
        email_addr = emailinfo.normalized
    except EmailNotValidError as e:
        raise APIError(
            message=f"邮箱格式无效: {e!s}",
            code=status.HTTP_400_BAD_REQUEST,
        ) from None

    code = await user_service.send_verification_code(email_addr, redis)
    if code is None:
        raise APIError(
            message="验证码存储失败",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        task = await send_code.kiq(
            email=email_addr,
            verification_code=code,
        )
        result = await task.wait_result(timeout=30)
        if not result.is_error:
            logger.info("验证码发送成功")
    except Exception as e:
        raise APIError(
            message=f"验证码发送失败: {e!s}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ) from None

    return APIResponse(
        message="验证码发送成功，请检查您的邮箱! (如果未收到邮件，请检查垃圾邮件箱)",
    )


# ------------------------------------------------------------------ #
# Passkey endpoints
# ------------------------------------------------------------------ #


@router.get("/passkey/registration-options")
async def passkey_registration_options(
    user: User = Depends(get_current_user_full),
    user_services: UserServices = Depends(user_services_dep),
    redis: AsyncRedis = Depends(get_redis),
):
    try:
        options = await user_services.passkey.create_registration_options(
            redis, user
        )
        return APIResponse(
            data=options_to_json_dict(options),
            message="Passkey 注册选项生成成功",
        )
    except ValueError:
        raise APIError(
            message="您的账户已经绑定了Passkey",
            code=status.HTTP_400_BAD_REQUEST,
        ) from None


@router.post("/passkey/register")
async def passkey_register(
    request: Request,
    body: PasskeyRegistrationRequest,
    user: User = Depends(get_current_user_full),
    user_services: UserServices = Depends(user_services_dep),
    redis: AsyncRedis = Depends(get_redis),
):
    # Use configured origin (the frontend domain), not request.base_url
    # because the browser sends the page origin, not the API host
    origin = settings.WEBAUTHN_ORIGIN
    error = await user_services.passkey.complete_passkey_registration(
        user, body.response, redis, origin
    )
    if error:
        raise APIError(message=error, code=status.HTTP_400_BAD_REQUEST)

    return APIResponse(message="Passkey 注册成功")


@router.get("/passkey/authentication-options")
async def passkey_authentication_options(
    redis: AsyncRedis = Depends(get_redis),
    user_services: UserServices = Depends(user_services_dep),
):
    options = await user_services.passkey.create_options(redis)
    return APIResponse(
        data=options_to_json_dict(options),
        message="Passkey 认证选项生成成功",
    )


@router.delete("/passkey/delete")
async def passkey_delete(
    user: User = Depends(get_current_user_full),
    user_services: UserServices = Depends(user_services_dep),
):
    success = await user_services.passkey.delete_passkey(user)
    if not success:
        raise APIError(
            message="您的账户尚未绑定Passkey",
            code=status.HTTP_400_BAD_REQUEST,
        )
    return APIResponse(message="Passkey 删除成功")


@router.post("/passkey/authenticate")
async def passkey_authenticate(
    request: Request,
    assertion: PasskeyAuthRequest,
    user_services: UserServices = Depends(user_services_dep),
    redis: AsyncRedis = Depends(get_redis),
):
    user, tokens, error = await user_services.passkey.complete_passkey_login(
        assertion.assertion, redis, request
    )
    if error or user is None or tokens is None:
        raise APIError(
            message=error or "认证失败", code=status.HTTP_400_BAD_REQUEST
        )

    login_data = user_services.user.build_login_data(
        user, tokens["refresh_token"]
    )
    return _build_login_response(
        login_data,
        tokens["access_token"],
        tokens["refresh_token"],
        message="Passkey 登录成功",
    )


# ------------------------------------------------------------------ #
# GitHub OAuth endpoints
# ------------------------------------------------------------------ #


@router.get("/github")
async def github_login(
    request: Request,
    user_services: UserServices = Depends(user_services_dep),
):
    auth_url, state, code_verifier, mode = (
        user_services.github.generate_oauth_url(mode="login")
    )
    request.session["oauth_state"] = state
    request.session["code_verifier"] = code_verifier
    request.session["oauth_mode"] = mode
    return RedirectResponse(auth_url)


@router.get("/github/bind")
async def github_bind(
    request: Request,
    current_user: int = Depends(manager),
    user_services: UserServices = Depends(user_services_dep),
):
    auth_url, state, code_verifier, mode = (
        user_services.github.generate_oauth_url(mode="bind")
    )
    request.session["oauth_state"] = state
    request.session["code_verifier"] = code_verifier
    request.session["oauth_mode"] = mode
    return RedirectResponse(auth_url)


@router.post("/github/unbind")
async def github_unbind(
    current_user: User = Depends(get_current_user_full),
    user_services: UserServices = Depends(user_services_dep),
):
    url = settings.FRONTEND_URL + "/settings?error=github_not_bound"
    if not current_user.github_id:
        return RedirectResponse(url=url)

    await user_services.github.unbind_github(current_user)
    return RedirectResponse(
        url=settings.FRONTEND_URL + "/settings?success=github_unbound"
    )


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str,
    state: str,
    user_services: UserServices = Depends(user_services_dep),
    redis: AsyncRedis = Depends(get_redis),
):
    if state != request.session.get("oauth_state"):
        return RedirectResponse(
            url=settings.FRONTEND_URL + "/login?error=invalid_oauth_state"
        )

    code_verifier = request.session.pop("code_verifier")
    if not code_verifier:
        return RedirectResponse(
            url=settings.FRONTEND_URL + "/login?error=missing_pkce_info"
        )

    # Exchange code for access token
    try:
        access_token = await user_services.github.exchange_github_code(
            code, code_verifier
        )
        github_user = await user_services.github.fetch_github_user_info(
            access_token
        )
    except GitHubAuthError as e:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={e.error_code}"
        )

    github_id = github_user["id"]
    username = github_user["login"]
    email = github_user.get("email") or f"{username}@github.com"
    avatar_url = github_user.get("avatar_url")

    oauth_mode = request.session.pop("oauth_mode", "login")

    if oauth_mode == "bind":
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            return RedirectResponse(
                url=settings.FRONTEND_URL + "/settings?error=not_logged_in"
            )
        current_user = await resolve_user_from_token(refresh_token)
        if current_user is None:
            return RedirectResponse(
                url=settings.FRONTEND_URL + "/settings?error=not_logged_in"
            )

        result = await user_services.github.bind_github(
            current_user, github_id, avatar_url
        )
        if result == "github_already_bound":
            return RedirectResponse(
                url=settings.FRONTEND_URL
                + "/settings?error=github_already_bound"
            )

        return RedirectResponse(
            url=settings.FRONTEND_URL + "/settings?success=github_bound"
        )
    else:
        user = await user_services.github.handle_github_login_callback(
            github_id, username, email, avatar_url, request
        )
        tokens = await user_services.user.create_tokens(user, redis)

        response = RedirectResponse(url=settings.FRONTEND_URL)
        cookie_domain = settings.COOKIE_DOMAIN
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            samesite="strict",
            secure=True,
            domain=cookie_domain or None,
        )

        return response
