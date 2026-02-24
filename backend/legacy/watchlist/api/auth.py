from __future__ import annotations

import random
from datetime import datetime

from apiflask import Schema
from apiflask.fields import Boolean, Integer, String
from flask_login import current_user, login_required, login_user, logout_user
from flask_mail import Message
from flask_wtf.csrf import generate_csrf
from sqlalchemy import select

from watchlist.api import api
from watchlist.api.utils import APIResponse
from watchlist.extensions import csrf, db, mail
from watchlist.models import Profile, SignUpCode, User


class LoginInSchema(Schema):
    username = String(required=True)
    password = String(required=True)
    remember_me = Boolean(load_default=False)


class LoginOutSchema(Schema):
    id = Integer()
    username = String()
    is_admin = Boolean()


class RegisterInSchema(Schema):
    username = String(required=True)
    password = String(required=True)
    email = String(required=True)
    email_code = String(required=True)


class RegisterOutSchema(Schema):
    id = Integer()
    username = String()
    is_admin = Boolean()


class EmailCodeInSchema(Schema):
    email = String(required=True)


# 用户登录接口
#
# 处理用户登录认证，验证用户名和密码后创建会话
# 注意：用户名不存在和密码错误返回相同错误信息，防止暴力破解
# 成功登录后返回用户基本信息（不包含敏感信息）
@api.post("/auth/login")
@api.input(LoginInSchema, location="json")
def login(json_data):
    """
    用户登录

    Args:
        json_data: 包含 username, password, remember_me/rememberMe 的 JSON 数据

    Returns:
        APIResponse: 成功时返回用户信息 (id, username, is_admin)失败时返回错误信息
    """
    username = json_data["username"]
    password = json_data["password"]
    # 支持两种参数名：remember_me (后端规范) 或 rememberMe (前端兼容)
    remember_me = json_data.get(
        "remember_me", json_data.get("rememberMe", False)
    )

    user = db.session.execute(
        select(User).filter_by(username=username)
    ).scalar_one_or_none()
    # 注意：这里不区分用户名不存在和密码错误的情况，以防止暴力破解攻击
    if user is None or not user.validate_password(password):
        return APIResponse.error_response("用户名或密码错误", code=401)

    # 验证通过，创建用户会话
    login_user(user, remember=remember_me)

    # 跟踪登录信息（可选）
    user.active = True
    user.last_login_at = user.current_login_at
    user.current_login_at = (
        datetime.now()
    )  # Use naive datetime for TIMESTAMP WITHOUT TIME ZONE
    user.last_login_ip = user.current_login_ip
    user.current_login_ip = User.get_real_ip()
    user.login_count += 1
    db.session.commit()

    return APIResponse.api_response(
        data={
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
        },
        message="登录成功",
    )


# 退出登录
@api.post("/auth/logout")
@login_required
def logout():
    current_user.active = False
    db.session.commit()
    logout_user()

    response = APIResponse.api_response(message="退出成功")
    return response


# 获取当前登录用户信息
#
# 返回当前认证用户的完整信息，包括基础信息和个人资料
# 如果用户还没有个人资料，会自动创建（懒加载模式）
@api.get("/auth/me")
@login_required
def me():
    """
    获取当前登录用户信息

    Returns:
        APIResponse: 包含用户完整信息 (id, username, is_admin, name, email, gender, mobile, photo)
    """
    # 自动创建缺失的个人资料（懒加载机制）
    if not current_user.profile:
        profile = Profile(user_id=current_user.id)
        db.session.add(profile)
        db.session.commit()
        # 刷新当前用户对象以加载新创建的资料关系
        db.session.refresh(current_user)

    profile = current_user.profile
    return APIResponse.api_response(
        data={
            "id": current_user.id,
            "username": current_user.username,
            "is_admin": current_user.is_admin,
            "name": current_user.name,
            "email": profile.email,
            "gender": profile.gender,
            "mobile": profile.mobile,
            "photo": profile.photo,
        }
    )


@api.get("/auth/csrf-token")
@csrf.exempt
def get_csrf_token():
    """
    获取 CSRF Token

    Returns:
        APIResponse: 成功时返回新的 CSRF Token-失败时返回错误信息
    """

    response = APIResponse.api_response(
        data={"csrf_token": generate_csrf()},
        message="获取 CSRF Token 成功（新生成）",
    )

    return response


# 刷新 CSRF Token（强制生成新 Token，覆盖旧 Token）
@api.get("/auth/csrf-token/refresh")
@csrf.exempt
def refresh_csrf_token():
    """
    刷新 CSRF Token强制生成新 Token覆盖旧 Token
    """
    response = APIResponse.api_response(
        data={"csrf_token": generate_csrf()},
        message="获取 CSRF Token 成功（刷新生成）",
    )

    return response


@api.post("/auth/register")
@api.input(RegisterInSchema, location="json")
def register(json_data):
    """
    用户注册

    Args:
        json_data: 包含 username, password, email, email_code 的 JSON 数据

    Returns:
        APIResponse: 成功时返回用户信息 (id, username, is_admin), 失败时返回错误信息
    """
    username = json_data["username"]
    password = json_data["password"]
    email = json_data["email"]
    email_code = json_data["email_code"]

    existing_user = db.session.execute(
        select(User).filter_by(username=username)
    ).scalar_one_or_none()
    if existing_user:
        return APIResponse.error_response("用户名已存在", code=400)

    code_model = db.session.execute(
        select(SignUpCode).filter_by(email=email, code=email_code)
    ).scalar_one_or_none()
    if not code_model:
        return APIResponse.error_response("无效的邮箱或验证码", code=400)

    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.flush()

    new_profile = Profile(user_id=new_user.id)
    new_profile.email = email
    new_profile.photo = "default.png"
    db.session.add(new_profile)

    db.session.commit()

    return APIResponse.api_response(
        data={
            "id": new_user.id,
            "username": new_user.username,
            "is_admin": new_user.is_admin,
        },
        message="注册成功",
        code=201,
    )


@api.post("/auth/email/code")
@api.input(EmailCodeInSchema, location="query")
def send_email_code(query_data):
    """
    发送注册邮箱验证码

    Args:
        query_data: 包含 email 的查询参数

    Returns:
        APIResponse: 成功时返回发送成功信息-失败时返回错误信息
    """
    email = query_data["email"]

    code = [random.choice("012345678901234567890123456789") for _ in range(6)]
    verification_code = "".join(code)

    message = Message(
        subject="Your Verification Code",
        recipients=[email],
        body=f"Your verification code is: {verification_code}",
    )

    try:
        mail.send(message)
    except Exception as e:
        return APIResponse.error_response(f"发送邮件失败: {e!s}", code=500)

    existing_code = db.session.execute(
        select(SignUpCode).filter_by(email=email)
    ).scalar_one_or_none()

    if existing_code:
        existing_code.code = verification_code
        existing_code.created_at = datetime.now()
    else:
        sign_up_code = SignUpCode(email=email, code=verification_code)
        db.session.add(sign_up_code)

    db.session.commit()

    return APIResponse.api_response(
        message=f"验证码已发送到 {email}",
    )
