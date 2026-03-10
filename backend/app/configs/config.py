# config.py

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def get_env_file_path() -> str:
    """Get the absolute path to .env file."""
    from pathlib import Path

    env = str(Path(__file__).resolve().parent.parent / ".env")
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
    WEBAUTHN_RP_ID: str = "kanocifer.com"
    WEBAUTHN_ORIGIN: str = "https://kanocifer.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# 实例化并导出
settings = Settings()


@lru_cache
def get_settings():
    return settings


if __name__ == "__main__":
    # 测试配置是否正确加载
    print(get_settings().DATABASE_URL)
    print(get_settings().MONGO_URI)
    print(get_env_file_path())
