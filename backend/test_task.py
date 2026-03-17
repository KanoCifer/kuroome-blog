import asyncio

from app.utils.mailservice import send_bootstrap_emails

if __name__ == "__main__":
    import asyncio

    # 测试发送引导邮件
    test_email = "kano3255@outlook.com"
    asyncio.run(send_bootstrap_emails(test_email))
