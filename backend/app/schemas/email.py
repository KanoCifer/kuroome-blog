"""Email schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr


class BootstrapEmailContent(BaseModel):
    """引导邮件内容模型"""

    subject: str
    body: str
    recipient: EmailStr


class EmailCodeContent(BaseModel):
    """验证码邮件内容模型"""

    subject: str = "ReadingList 注册验证码"
    recipient: EmailStr
    verification_code: str
    body: str = ""  # 可选的邮件正文内容
