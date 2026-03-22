# config.py

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from rich import print


def get_env_file_path() -> str:
    """Get the absolute path to .env file."""
    from pathlib import Path

    env = str(Path(__file__).resolve().parent.parent.parent / ".env")
    return env


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    SECRET_KEY: str = ""
    MONGO_URI: str = ""
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    API_VERSION: str = "2.0.0"
    API_TITLE: str = "Reading List API"
    API_DESCRIPTION: str = "API文档。Personal reading tracker API built with FastAPI, PostgreSQL, and MongoDB. Manage your reading list, track progress, and get book recommendations."
    API_KEY: str = ""
    CSRF_COOKIE_SECURE: bool = True
    # WebAuthn / Passkey settings
    WEBAUTHN_RP_ID: str = "kanocifer.chat"
    WEBAUTHN_ORIGIN: str = "https://kanocifer.chat"
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = ""
    FRONTEND_URL: str = "https://kanocifer.chat"
    GITEE_WEBHOOK_SECRET: str | None = None
    SEND_BOOT_EMAIL: bool = True
    ADMIN_EMAIL: str = ""
    FEISHU_WEBHOOK_URL: str = ""
    VITE_JS_API_TOKEN: str = ""
    AMAP_SECURITY_CODE: str = ""
    AMAP_WEB_KEY: str = ""
    JWT_PRIVATE_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=get_env_file_path(),
        env_file_encoding="utf-8",
        extra="ignore",
    )


# 实例化并导出
settings = Settings()


@lru_cache
def get_settings() -> Settings:
    return settings


if __name__ == "__main__":
    # 测试配置是否正确加载
    get_settings.cache_clear()  # 清除缓存以确保重新加载配置
    print(get_settings().DATABASE_URL)
    print(get_settings().MONGO_URI)
    print(get_env_file_path())
    print(f"SEND_BOOT_EMAIL: {get_settings().SEND_BOOT_EMAIL}")
    print(f"ADMIN_EMAIL: {get_settings().ADMIN_EMAIL}")
    print(f"FEISHU_WEBHOOK_URL: {get_settings().FEISHU_WEBHOOK_URL}")
    print(f"VITE_JS_API_TOKEN: {get_settings().VITE_JS_API_TOKEN}")
    print(f"AMAP_SECURITY_CODE: {get_settings().AMAP_SECURITY_CODE}")
    print(f"AMAP_WEB_KEY: {get_settings().AMAP_WEB_KEY}")
    print(f"JWT_PRIVATE_KEY: {get_settings().JWT_PRIVATE_KEY}")
