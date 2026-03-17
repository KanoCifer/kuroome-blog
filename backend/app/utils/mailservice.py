import datetime

from email_validator import EmailNotValidError, ValidatedEmail, validate_email
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import BaseModel, EmailStr

from app.configs import get_settings
from app.configs.logger import logger
from app.dependencies.mail import MailConfig


class BootstrapEmailContent(BaseModel):
    """引导邮件内容模型"""

    subject: str
    body: str
    recipient: EmailStr


async def send_bootstrap_emails(admin_email: str):
    """发送引导邮件给管理员"""
    settings = get_settings().SEND_BOOT_EMAIL
    # print(f"引导邮件发送开关: {settings}")
    logger.info(f"引导邮件发送开关: {settings}")
    if not settings:
        return

    # 验证管理员邮箱地址
    try:
        valid_email: ValidatedEmail = validate_email(admin_email)
        email: EmailStr = valid_email.email
        now: str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        content = BootstrapEmailContent(
            subject="Reading List API 引导邮件",
            body=f"""服务已成功启动！\n\n当前时间：{now}""",
            recipient=email,
        )
        # print(f"准备发送引导邮件到管理员邮箱: {email}")
    except EmailNotValidError:
        # print(
        #     f"[red]无效的管理员邮箱地址: {admin_email}，引导邮件将不会发送[/red]"
        # )
        logger.error(
            f"无效的管理员邮箱地址: {admin_email}，引导邮件将不会发送"
        )
        return

    message = MessageSchema(
        subject=content.subject,
        recipients=[content.recipient],  # type: ignore
        body=content.body,
        subtype=MessageType.plain,
    )

    fm = FastMail(MailConfig.conf)

    try:
        await fm.send_message(message)
        # print(f"引导邮件已发送到 {content.recipient}")
        logger.info(f"引导邮件已发送到 {content.recipient}")
    except Exception as e:
        logger.error(f"发送引导邮件失败: {e!s}")
        # print(f"[red]发送引导邮件失败: {e!s}[/red]")
        raise e
