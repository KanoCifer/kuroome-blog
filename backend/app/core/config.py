# config.py

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    # 允许获取高德安全密钥的前端来源
    AMAP_KEY_ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174,https://kanocifer.chat,https://m.kanocifer.chat"
    JWT_PRIVATE_KEY: str = ""
    # Cookie 跨域配置
    COOKIE_DOMAIN: str = ""
    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 30
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    QWEATHER_BASE_URL: str = ""

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
