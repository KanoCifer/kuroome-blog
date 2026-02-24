import os
from pathlib import Path

from dotenv import load_dotenv

# Configuration settings
BASE_DIR: Path = Path(__file__).resolve().parent

# 加载 .env 文件
load_dotenv(BASE_DIR.parent / ".env")


# Base配置类
class BaseConfig:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev")
    MEDIA_PATH: Path = BASE_DIR / "media"

    # Flask-Babel 配置
    BABEL_DEFAULT_LOCALE = "zh"  # 默认语言
    BABEL_DEFAULT_TIMEZONE = "Asia/Shanghai"  # 默认时区
    BABEL_TRANSLATION_DIRECTORIES = str(
        BASE_DIR / "translations"
    )  # 翻译文件目录
    # MongoDB settings
    MONGO_URI: str = os.getenv(
        "MONGO_URI", "mongodb://localhost:27017/readinglist"
    )
    MONGO_CONNECT = False  # 避免在应用启动时连接数据库
    # Mail settings
    MAIL_SERVER: str = "smtp.qq.com"
    MAIL_PORT: int = 465
    MAIL_USE_TLS: bool = False
    MAIL_USE_SSL: bool = True
    MAIL_USERNAME: str | None = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD: str | None = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = ("Watchlist", MAIL_USERNAME or "noreply@example.com")
    # CSRF Cookie 设置
    WTF_CSRF_ENABLED = True
    WTF_CSRF_CHECK_DEFAULT = True

    # Cookie 配置（关键！）
    SESSION_COOKIE_HTTPONLY = True  # 防止 XSS
    SESSION_COOKIE_SAMESITE = "Lax"  # 或 'Strict'
    SESSION_COOKIE_SECURE = True  # 生产环境 HTTPS


class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True
    ASSETS_DEBUG: bool = True
    # Database settings
    SQLALCHEMY_DATABASE_URI: str | None = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    CACHE_TYPE: str = "SimpleCache"


class ProductionConfig(BaseConfig):
    DEBUG: bool = False
    ASSETS_DEBUG: bool = False
    # Database settings
    SQLALCHEMY_DATABASE_URI: str | None = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    CACHE_TYPE: str = "RedisCache"


class TestingConfig(BaseConfig):
    TESTING: bool = True
    WTF_CSRF_ENABLED: bool = False
    SQLALCHEMY_DATABASE_URI: str | None = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False


config = {
    "dev": DevelopmentConfig,
    "prod": ProductionConfig,
    "test": TestingConfig,
}
