from fastapi_mail import ConnectionConfig
from pydantic import SecretStr

from app.core.config import settings


class MailConfig:
    """邮件配置类 - 使用 FastAPI-Mail 的 ConnectionConfig"""

    conf = ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=SecretStr(settings.MAIL_PASSWORD),
        MAIL_FROM=settings.MAIL_USERNAME,
        MAIL_PORT=587,
        MAIL_SERVER="smtp.qq.com",
        MAIL_FROM_NAME="Kuroome's Mail Service",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )
