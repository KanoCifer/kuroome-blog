from pydantic import BaseModel, Field


class ImportBooksIn(BaseModel):
    """Import books from WeRead input schema."""

    weread_cookie: str


class SaveUserInfoIn(BaseModel):
    """保存微信读书用户信息输入 schema."""

    api_key: str = Field(..., min_length=1, description="微信读书 API Key")

