import base64


def base64url_encode(data: str | bytes) -> str:
    """Base64URL 编码移除填充符"""
    if isinstance(data, str):
        data = data.encode("utf-8")
    encoded = base64.urlsafe_b64encode(data).decode("ascii")
    return encoded.rstrip("=")


def base64url_decode(encoded: str | bytes) -> str:
    """Base64URL 解码自动补全填充符"""
    if isinstance(encoded, str):
        padding = 4 - len(encoded) % 4
        if padding != 4:
            encoded += "=" * padding
    decoded = base64.urlsafe_b64decode(encoded)
    return decoded.decode("utf-8")
