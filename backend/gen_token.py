"""生成 365 天有效期的 access_token 脚本.

用法:
    python gen_token.py <user_id>           # 指定 user_id
    python gen_token.py                     # 默认 user_id=1

依赖: uv run --with python-jose --with pydantic-settings python gen_token.py
"""

from __future__ import annotations

import argparse
import secrets
from datetime import UTC, datetime, timedelta
from getpass import getpass

from jose import jwt

ALGORITHM = "HS256"


def create_access_token(*, sub: str, secret: str, expires: timedelta) -> str:
    """与 app.api.des.auth.create_access_token 完全一致的 payload 结构."""
    payload = {
        "sub": sub,
        "exp": datetime.now(UTC) + expires,
        "jti": secrets.token_hex(16),
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="生成 365 天有效期的 access_token"
    )
    parser.add_argument(
        "user_id",
        nargs="?",
        type=str,
        default="1",
        help="subject (user_id)，默认 1",
    )
    args = parser.parse_args()

    secret = getpass("SECRET_KEY: ")
    if not secret:
        raise ValueError("SECRET_KEY 不能为空")

    token = create_access_token(
        sub=args.user_id, secret=secret, expires=timedelta(days=365)
    )
    print(token)


if __name__ == "__main__":
    main()
