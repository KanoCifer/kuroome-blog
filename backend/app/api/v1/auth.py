from __future__ import annotations

import json
from datetime import timedelta
from typing import Annotated

import httpx
from email_validator import EmailNotValidError, ValidatedEmail, validate_email
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import JSONResponse, RedirectResponse
from webauthn import options_to_json

from app.api.des.auth import manager
from app.api.des.csrf import csrf_manager
from app.api.des.des import user_service_dep
from app.api.des.limiter import limiter
from app.api.des.redis import AsyncRedis, get_redis
from app.core.config import settings
from app.core.logger import logger
from app.models.models import User
from app.schemas.auth import (
    EmailSchema,
    PasskeyAuthRequest,
    PasskeyRegistrationRequest,
)
from app.schemas.response import APIResponse
from app.schemas.schemas import LoginIn, RegisterIn, UserSettingsIn
from app.services.user_service import UserService
from app.tasks import send_code

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


# ------------------------------------------------------------------ #
# Helpers
# ------------------------------------------------------------------ #


def _build_login_response(
    user: User,
    profile,
    tokens: dict[str, str],
    message: str = "登录成功",
) -> JSONResponse:
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
            "refresh_token": tokens["refresh_token"],
            "has_passkey": bool(user.passkey_credential),
            "github_bound": bool(user.github_id),
        },
        message=message,
    )
    manager.set_cookie(response=response, token=tokens["access_token"])
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        samesite="lax",
        secure=True,
    )
    csrf_manager.set_csrf_cookie(response)
    return response


# ------------------------------------------------------------------ #
# Auth endpoints
# ------------------------------------------------------------------ #


@router.get("/csrf-token", response_model=APIResponse)
async def csrf_token(response: Response) -> JSONResponse:
    """生成 CSRF token 并设置 cookie，前端可以调用此接口获取 token 以支持后续的认证请求。"""
    res: JSONResponse = APIResponse.ok(message="CSRF token 已生成")
    csrf_manager.set_csrf_cookie(res)
    return res


@router.get("/refresh-token")
async def refresh_token(
    request: Request,
    refresh_token: str = Cookie(None),
) -> JSONResponse:
    """使用刷新令牌获取新的访问令牌。刷新令牌可以来自 Cookie 或请求头。

    param:
        refresh_token: 来自 Cookie 的刷新令牌
    """
    token: str | None = refresh_token or request.headers.get("refresh_token")
    if not token:
        return APIResponse.error(
            message="刷新令牌不存在",
            code=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        user = await manager.get_current_user(token)
        if user is None:
            return APIResponse.error(
                message="用户不存在",
                code=status.HTTP_401_UNAUTHORIZED,
            )

        access_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(hours=12)
        )
        new_refresh_token = manager.create_access_token(
            data={"sub": str(user.id)}, expires=timedelta(days=30)
        )

        response: JSONResponse = APIResponse.ok(
            message="访问令牌已刷新",
            code=status.HTTP_200_OK,
            data={"refresh_token": new_refresh_token},
        )
        manager.set_cookie(response=response, token=access_token)
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


@router.post("/login", response_model=APIResponse)
@limiter.limit(limit_value="5/minute")
async def login(
    request: Request,
    data: LoginIn,
    user_service: UserService = Depends(user_service_dep),
) -> JSONResponse:
    """使用用户名和密码登录，成功后返回访问令牌和刷新令牌。

    param:
        data: 包含 username, password 和 remember_me 的请求体
        user_service: 用户服务实例
    """
    user: User | None = await user_service.authenticate_user(
        data.username, data.password
    )

    if user is None:
        return APIResponse.error(
            message="用户名或密码错误",
            code=status.HTTP_401_UNAUTHORIZED,
        )

    await user_service.record_login(user, request)
    tokens = user_service.create_tokens(user, remember_me=data.remember_me)
    return _build_login_response(user, user.profile, tokens)


@router.post("/logout", response_model=APIResponse)
async def logout(
    user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_redis),
    user_service: UserService = Depends(user_service_dep),
):
    await user_service.logout(user, redis)

    response = APIResponse.ok(
        message="已退出登录",
        code=status.HTTP_200_OK,
    )
    response.delete_cookie(key="refresh_token")
    response.delete_cookie(key=manager.cookie_name)
    return response


@router.post("/heartbeat", response_model=APIResponse)
@limiter.limit(limit_value="60/minute")
async def heartbeat(
    request: Request,
    user: User = Depends(manager),
    redis: AsyncRedis = Depends(get_redis),
    user_service: UserService = Depends(user_service_dep),
):
    await user_service.record_heartbeat(user, redis)
    return APIResponse.ok(
        message="心跳上报成功",
        code=status.HTTP_200_OK,
    )


@router.put("/settings")
async def update_user_settings(
    data: UserSettingsIn,
    user: User = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
):
    try:
        result = await user_service.update_settings(user, data)
    except ValueError:
        return APIResponse.error(
            message="Username already exists.",
            code=status.HTTP_400_BAD_REQUEST,
        )

    return APIResponse.ok(
        data=result,
        message="Profile updated successfully.",
        code=status.HTTP_200_OK,
    )


@router.put("/upload-pic")
async def upload_avatar(
    image: Annotated[UploadFile, File()],
    user: User = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
):
    result = await user_service.upload_avatar(user, image)

    return APIResponse.ok(
        data=result,
        message="Avatar uploaded successfully.",
        code=status.HTTP_200_OK,
    )


@router.get("/me")
async def me(
    current_user: User = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
):
    result = await user_service.get_user_with_profile(current_user.id)
    if result is None:
        return APIResponse.error(
            message="用户不存在",
            code=status.HTTP_404_NOT_FOUND,
        )
    user, profile = result
    return APIResponse.ok(
        data=user_service.user_to_dict(user, profile),
        message="获取用户信息成功",
        code=status.HTTP_200_OK,
    )


@router.post("/register")
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
        return APIResponse.error(
            message="用户名已存在或邮箱已注册或验证码无效",
            code=status.HTTP_400_BAD_REQUEST,
        )

    return APIResponse.ok(
        data={
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
        },
        message="注册成功",
        code=status.HTTP_201_CREATED,
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
        return APIResponse.error(
            message=f"邮箱格式无效: {e!s}",
            code=status.HTTP_400_BAD_REQUEST,
        )

    code = await user_service.send_verification_code(email_addr, redis)
    if code is None:
        return APIResponse.error(
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
        return APIResponse.error(
            message=f"验证码发送失败: {e!s}",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return APIResponse.ok(
        message="验证码发送成功，请检查您的邮箱! (如果未收到邮件，请检查垃圾邮件箱)",
        code=status.HTTP_202_ACCEPTED,
    )


# ------------------------------------------------------------------ #
# Passkey endpoints
# ------------------------------------------------------------------ #


@router.get("/passkey/registration-options")
async def passkey_registration_options(
    user: User = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
    redis: AsyncRedis = Depends(get_redis),
):
    try:
        return APIResponse.ok(
            data=await user_service.create_registration_options(redis, user),
            message="Passkey 注册选项生成成功",
        )
    except ValueError:
        return APIResponse.error(
            message="您的账户已经绑定了Passkey",
            code=status.HTTP_400_BAD_REQUEST,
        )


@router.post("/passkey/register")
async def passkey_register(
    request: PasskeyRegistrationRequest,
    user: User = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
    redis: AsyncRedis = Depends(get_redis),
):
    error = await user_service.complete_passkey_registration(
        user, request.response, redis
    )
    if error:
        return APIResponse.error(
            message=error, code=status.HTTP_400_BAD_REQUEST
        )

    return APIResponse.ok(message="Passkey 注册成功")


@router.get("/passkey/authentication-options")
async def passkey_authentication_options(
    redis: AsyncRedis = Depends(get_redis),
    user_service: UserService = Depends(user_service_dep),
):
    options = await user_service.create_options(redis)
    return APIResponse.ok(
        data=json.loads(options_to_json(options)),
        message="Passkey 认证选项生成成功",
    )


@router.delete("/passkey/delete")
async def passkey_delete(
    user: User = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
):
    success = await user_service.delete_passkey(user)
    if not success:
        return APIResponse.error(
            message="您的账户尚未绑定Passkey",
            code=status.HTTP_400_BAD_REQUEST,
        )
    return APIResponse.ok(message="Passkey 删除成功")


@router.post("/passkey/authenticate")
async def passkey_authenticate(
    request: Request,
    assertion: PasskeyAuthRequest,
    user_service: UserService = Depends(user_service_dep),
    redis: AsyncRedis = Depends(get_redis),
):
    user, tokens, error = await user_service.complete_passkey_login(
        assertion.response, redis, request
    )
    if error or user is None or tokens is None:
        return APIResponse.error(
            message=error or "认证失败", code=status.HTTP_400_BAD_REQUEST
        )

    return _build_login_response(
        user, user.profile, tokens, message="Passkey 登录成功"
    )
    if error:
        return APIResponse.error(
            message=error, code=status.HTTP_400_BAD_REQUEST
        )

    return _build_login_response(
        user, user.profile, tokens, message="Passkey 登录成功"
    )


# ------------------------------------------------------------------ #
# GitHub OAuth endpoints
# ------------------------------------------------------------------ #


@router.get("/github")
async def github_login(
    request: Request,
    user_service: UserService = Depends(user_service_dep),
):
    auth_url, state, code_verifier, mode = user_service.generate_oauth_url(
        mode="login"
    )
    request.session["oauth_state"] = state
    request.session["code_verifier"] = code_verifier
    request.session["oauth_mode"] = mode
    return RedirectResponse(auth_url)


@router.get("/github/bind")
async def github_bind(
    request: Request,
    current_user: User = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
):
    auth_url, state, code_verifier, mode = user_service.generate_oauth_url(
        mode="bind"
    )
    request.session["oauth_state"] = state
    request.session["code_verifier"] = code_verifier
    request.session["oauth_mode"] = mode
    return RedirectResponse(auth_url)


@router.post("/github/unbind")
async def github_unbind(
    current_user: User = Depends(manager),
    user_service: UserService = Depends(user_service_dep),
):
    url = settings.FRONTEND_URL + "/settings?error=github_not_bound"
    if not current_user.github_id:
        return RedirectResponse(url=url)

    await user_service.unbind_github(current_user)
    return RedirectResponse(
        url=settings.FRONTEND_URL + "/settings?success=github_unbound"
    )


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str,
    state: str,
    user_service: UserService = Depends(user_service_dep),
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

    # Exchange access_token
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
                timeout=httpx.Timeout(
                    connect=10.0, read=30.0, write=10.0, pool=5.0
                ),
                follow_redirects=True,
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()
    except httpx.ReadTimeout, httpx.ConnectTimeout, httpx.PoolTimeout:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_timeout"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"GitHub token exchange failed: {e.response.text}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_auth_failed"
        )
    except httpx.NetworkError as e:
        logger.error(f"GitHub network error: {e!s}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_network_error"
        )
    except ValueError as e:
        logger.error(f"GitHub token JSON parse failed: {e!s}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_invalid_response"
        )

    if "error" in token_data:
        error_msg = token_data.get("error_description", "github_auth_failed")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={error_msg}"
        )

    access_token = token_data["access_token"]

    # Get user info
    try:
        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=httpx.Timeout(
                    connect=10.0, read=30.0, write=10.0, pool=5.0
                ),
                follow_redirects=True,
            )
            user_resp.raise_for_status()
            github_user = user_resp.json()
    except httpx.ReadTimeout, httpx.ConnectTimeout, httpx.PoolTimeout:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_timeout"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"GitHub user info failed: {e.response.text}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_user_info_failed"
        )
    except httpx.NetworkError as e:
        logger.error(f"GitHub network error: {e!s}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_network_error"
        )
    except ValueError as e:
        logger.error(f"GitHub user info JSON parse failed: {e!s}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=github_invalid_response"
        )

    github_id = github_user["id"]
    username = github_user["login"]
    email = github_user.get("email") or f"{username}@github.com"
    avatar_url = github_user.get("avatar_url")

    oauth_mode = request.session.pop("oauth_mode", "login")

    if oauth_mode == "bind":
        try:
            current_user = await manager(request)
        except Exception:
            return RedirectResponse(
                url=settings.FRONTEND_URL + "/settings?error=not_logged_in"
            )

        result = await user_service.bind_github(
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
        user = await user_service.handle_github_login_callback(
            github_id, username, email, avatar_url, request
        )
        tokens = user_service.create_tokens(user)

        response = RedirectResponse(url=settings.FRONTEND_URL)
        manager.set_cookie(response=response, token=tokens["access_token"])
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            samesite="lax",
            secure=True,
        )
        csrf_manager.set_csrf_cookie(response)

        return response
