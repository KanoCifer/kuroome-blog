import base64
import hashlib
import secrets


def generate_pkce_pair() -> tuple[str, str]:
    """
    生成 OAuth PKCE 验证对
    返回: (code_verifier, code_challenge)
    符合 RFC 7636 标准
    """
    # 1. 生成 code_verifier: 43-128 个字符的加密安全随机字符串
    code_verifier = (
        base64.urlsafe_b64encode(secrets.token_bytes(32))
        .decode("utf-8")
        .rstrip("=")
    )

    # 2. 生成 code_challenge: code_verifier 的 SHA256 哈希后做 Base64URL 编码
    code_challenge = (
        base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode("utf-8")).digest()
        )
        .decode("utf-8")
        .rstrip("=")
    )

    return code_verifier, code_challenge
