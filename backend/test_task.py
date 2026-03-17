import asyncio

from app.configs.config import get_settings
from app.utils.mailservice import send_bootstrap_emails

get_settings.cache_clear()


if __name__ == "__main__":
    # 测试发送引导邮件
    test_email = "kano3255@outlook.com"
    asyncio.run(send_bootstrap_emails(test_email))
