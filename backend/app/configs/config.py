# config.py

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # 在这里定义变量，类型会自动校验
    DATABASE_URI: str = ""
    SECRET_KEY: str = ""
    MONGO_URI: str = ""
    # 👇 新增：把报错里提到的这四个字段加进来
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    API_VERSION: str = "2.0.0"
    API_TITLE: str = "Reading List API"
    API_DESCRIPTION: str = "API文档。Personal reading tracker API built with FastAPI, PostgreSQL, and MongoDB. Manage your reading list, track progress, and get book recommendations."
    API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",  # 指定环境变量文件路径
        env_file_encoding="utf-8",  # 指定环境变量文件编码
        extra="ignore",  # 允许额外的环境变量而不报错
    )


# 实例化并导出
settings = Settings()
