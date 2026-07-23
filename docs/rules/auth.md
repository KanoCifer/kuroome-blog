# 后端认证统一契约

> 状态: active | 更新: 2026-07-09
> 适用范围: Go `go-backend/`

## Token 格式

| 项                | 值                       |
| ----------------- | ------------------------ |
| 算法              | JWT `HS256`(HMAC-SHA256) |
| 签名密钥          | `SECRET_KEY`             |
| Access token TTL  | **24 小时**              |
| Refresh token TTL | **7 天**                 |

### JWT Claims

```json
{
  "sub": "42",
  "exp": 1783600000,
  "jti": "a1b2c3..."
}
```

- `sub`: 用户 ID 的十进制字符串
- `exp`: 过期时间(Unix timestamp,**必需**)
- `jti`: 唯一标识(secrets.token_hex(16),**必需** — 用于 refresh 轮换时区分相同 sub 的 token)

> **为何需要 jti**: 没有 `jti` 时,相同 `sub` + 相同 `exp` 会产出完全相同的 JWT,refresh 轮换后旧 token 与新 token 无法区分,白名单校验形同虚设。

### Token 传输

| Token   | 位置                                   | 说明                                                |
| ------- | -------------------------------------- | --------------------------------------------------- |
| Access  | `Authorization: Bearer <token>` Header | 两端一致                                            |
| Refresh | JSON response body                     | 主路径                                              |
| Refresh | HttpOnly cookie                        | `secure`, `samesite=strict`, `domain=COOKIE_DOMAIN` |

### Key 设计

```
refresh:{user_id}  →  "<jwt_string>"   TTL=7d
```

- **单设备模型**: 同一用户同时只有一个有效 refresh token;新登录覆盖旧值。
- 未来如需多设备,改为 `refresh:{user_id}:{jti}` 的哈希结构(二期)。

### 生命周期

```
login / refresh / passkey-login / github-login
    → create_tokens()
        → redis.set(f"refresh:{uid}", refresh_jwt, ex=7d)

refresh-token request
    → redis.get(f"refresh:{uid}")
    → 严格模式(ENFORCE_REDIS_REFRESH=True): key 必须存在且 == token
    → 兼容模式(default): key 存在且 != token 时拒绝; key 不存在 = 放行(旧 token 过渡)
    → 校验通过: 覆盖为新 refresh token(轮换)

logout
    → redis.delete(f"refresh:{uid}")
```

## Admin 校验

`ADMIN_USER_IDS="1,2"`

| 项               | 值                                    |
| ---------------- | ------------------------------------- |
| 判断方式         | User ID 硬编码白名单,**不是** DB 字段 |
| 未认证           | 401                                   |
| 已认证但非 admin | 403 `"Admin access required"`         |
| 中间件组合       | 必先 Auth 再 Admin                    |

## Password 哈希

| 项   | 值                                                   |
| ---- | ---------------------------------------------------- |
| 算法 | `bcrypt`(golang.org/x/crypto/bcrypt / Python bcrypt) |
| Cost | `bcrypt.DefaultCost`(=10)                            |

## Passkey / WebAuthn

| 项            | 值                          |
| ------------- | --------------------------- |
| RP ID         | `kanocifer.chat`            |
| Origin        | `https://kanocifer.chat`    |
| 限额          | 每用户 1 个凭证             |
| Challenge TTL | 5 分钟(Redis `passkey:*`)   |
| 注册登录后    | 发放 access + refresh token |
