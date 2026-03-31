"""Authentication schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, SecretStr


class LoginIn(BaseModel):
    """Login input schema."""

    username: str
    password: str
    remember_me: bool = False


class LoginOut(BaseModel):
    """Login output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_admin: bool


class RegisterIn(BaseModel):
    """Registration input schema."""

    username: str
    password: str
    email: str
    email_code: str


class RegisterOut(BaseModel):
    """Registration output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_admin: bool


class EmailCodeIn(BaseModel):
    """Email verification code request schema."""

    email: str


class EmailSchema(BaseModel):
    """Email input schema with validation."""

    email: EmailStr


class PasskeyRegistrationRequest(BaseModel):
    """Passkey registration request schema."""

    response: dict


class PasskeyAuthRequest(BaseModel):
    """Passkey authentication request schema."""

    response: dict


class GitHubOAuthConfig(BaseModel):
    """GitHub OAuth configuration schema."""

    client_id: str
    client_secret: SecretStr
    redirect_uri: str
    state: str
    scope: str = "read:user user:email"
    code_challenge: str
    code_challenge_method: str = "S256"
