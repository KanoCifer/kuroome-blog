# 双后端认证统一契约

> 状态: active | 更新: 2026-07-09
> 适用范围: Python `backend/` (`/api/v1`) 与 Go `go-backend/` (`/api/v3`) 共享

## 1. 概述

双后端共享同一 Postgres 用户库与 Redis,认证机制必须在两端保持一致,确保:

- 任一端签发的 **access token** 另一端可解析并识别 `sub`
- 任一端 **logout / refresh 轮换**后,旧 refresh token 在另一端也失效
- admin 用户在两端都能访问 admin 接口,非 admin 均返回 403

## 2. Token 格式

| 项 | 值 |
|---|---|
| 算法 | JWT `HS256`(HMAC-SHA256) |
| 签名密钥 | `SECRET_KEY`(两端共用同一 `.env`) |
| Access token TTL | **1 小时** |
| Refresh token TTL | **7 天** |

### 2.1 JWT Claims

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

### 2.2 Token 传输

| Token | 位置 | 说明 |
|---|---|---|
| Access | `Authorization: Bearer <token>` Header | 两端一致 |
| Refresh | JSON response body | 主路径 |
| Refresh (可选) | HttpOnly cookie | Python 已做(`secure`, `samesite=strict`, `domain=COOKIE_DOMAIN`);Go 可选跟 |

## 3. Refresh Token 白名单(Redis)

### 3.1 Key 设计

```
refresh:{user_id}  →  "<jwt_string>"   TTL=7d
```

- **单设备模型**: 同一用户同时只有一个有效 refresh token;新登录覆盖旧值。
- 未来如需多设备,改为 `refresh:{user_id}:{jti}` 的哈希结构(二期)。

### 3.2 生命周期

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

### 3.3 降级策略

| 场景 | Python 行为 | Go 行为 |
|---|---|---|
| Redis 可用 | 正常写 / 校验 / 删除 | 正常写 / 校验 / 删除 |
| Redis 不可用 | `redis=None`, 回退 stateless(向后兼容) | 安全失败(refuse),拒绝 refresh |
| 旧 token(无白名单条目) | `ENFORCE_REDIS_REFRESH` 开关控制 | 默认拒绝(当前实现) |

> **Python 配置项**: `ENFORCE_REDIS_REFRESH`(bool,默认 `False`)。部署稳定后置 `True`,强制所有 refresh 走 Redis 校验。

## 4. Admin 校验

```python
# Python
ADMIN_USER_IDS: list[int] = [1, 2]   # .env 配置
# User.is_admin → id in settings.ADMIN_USER_IDS
```

```go
// Go
ADMIN_USER_IDS  // 解析自 .env "1,2"
// AdminMiddleware → id in cfg.ADMIN_USER_IDS
```

| 项 | 值 |
|---|---|
| 判断方式 | User ID 硬编码白名单,**不是** DB 字段 |
| 未认证 | 401 |
| 已认证但非 admin | 403 `"Admin access required"` |
| 中间件组合 | 必先 Auth 再 Admin(Go 已修复) |

## 5. Password 哈希

| 项 | 值 |
|---|---|
| 算法 | `bcrypt`(golang.org/x/crypto/bcrypt / Python bcrypt) |
| Cost | `bcrypt.DefaultCost`(=10) |
| Hash 前缀 | `$2a$`(Go) / `$2b$`(Python 默认) / `$2y$`(旧实现) — 三种都识别 |
| 验证分流 | 前缀匹配 → bcrypt;否则 → werkzeug `check_password_hash`(兼容存量) |
| 静默升级 | Python 登录成功且 `needs_hash_upgrade()` 时重哈希为 bcrypt |

### 5.1 迁移策略(Lazy)

不强制存量用户重哈希:

- 新注册 / 密码修改 → bcrypt
- 验证时按前缀自动分流
- 存量 pbkdf2 用户首次成功登录 → 静默更新为 bcrypt

### 5.2 跨端兼容

Go 与 Python 使用同一 bcrypt 算法家族:
- Go 的 `$2a$` hash 在 Python `bcrypt.checkpw` 可验证
- Python 的 `$2b$` hash 在 Go `bcrypt.CompareHashAndPassword` 可验证

## 6. Passkey / WebAuthn

| 项 | 值 |
|---|---|
| RP ID | `kanocifer.chat` |
| Origin | `https://kanocifer.chat` |
| 限额 | 每用户 1 个凭证 |
| Challenge TTL | 5 分钟(Redis `passkey:*`) |
| 注册登录后 | 发放 access + refresh token pair(与密码登录同形制) |

## 7. 错误格式

统一响应信封:

```json
{ "message": "...", "data": <any|null> }
```

| 场景 | HTTP | message |
|---|---|---|
| 缺 / 无效 Authorization | 401 | `"Invalid token"` |
| 用户已删除(token 有效但 DB 无用户) | 401 | `"User not found"` |
| 非 admin 访问 admin 接口 | 403 | `"Admin access required"` |
| refresh token 白名单不匹配 | 401 | `"无效的刷新令牌或已过期"` / `"Invalid token"` |
| 密码错误 | 401 | `"用户名或密码错误"` / `"Invalid credentials"` |

> Python 额外返回 `WWW-Authenticate: Bearer` header;Go 可选补齐(见 `go-cors-ratelimit.md`)。

## 8. 路由对照

| 功能 | Python `/api/v1/auth` | Go `/api/v3` | 中间件 |
|---|---|---|---|
| 密码登录 | `POST /login` | `POST /login`(已切到 Go) | 公开 |
| 注册 | `POST /register` | —(暂留 Python,缺邮箱码) | 公开 + 邮箱码 |
| 刷新 | `GET /refresh-token`(cookie) | `POST /refresh-token`(cookie/body,已切到 Go) | 公开(refresh token) |
| 登出 | `POST /logout` | `POST /logout`(已切到 Go,清 cookie) | Auth |
| 当前用户 | `GET /me` | `GET /me`(已切到 Go) | Auth |
| 设置 | `PUT /settings` | —(暂留 Python) | Auth |
| 头像上传 | `POST /upload-pic` | —(暂留 Python) | Auth |
| Passkey 注册选项 | `GET /passkey/registration-options` | `GET /passkey/registration-options`(已切到 Go) | Auth |
| Passkey 注册完成 | `POST /passkey/register` | `POST /passkey/register`(已切到 Go) | Auth |
| Passkey 登录选项 | `GET /passkey/authentication-options` | `GET /passkey/authentication-options`(已切到 Go) | 公开 |
| Passkey 登录完成 | `POST /passkey/authenticate` | `POST /passkey/authenticate`(已切到 Go,发 cookie) | 公开 |
| Passkey 删除 | `DELETE /passkey/delete` | `DELETE /passkey/delete`(已切到 Go) | Auth |
| GitHub 登录 | `GET /github` | `GET /auth/github`(已切到 Go) | 公开 |
| GitHub 绑定 | `GET /github/bind` | `GET /github/bind`(已切到 Go) | Auth |
| GitHub 回调 | `GET /github/callback` | `GET /auth/github/callback`(已切到 Go) | 公开 |
| GitHub 解绑 | `POST /github/unbind` | `POST /github/unbind`(已切到 Go) | Auth |
| 邮箱验证码 | `POST /email/code` | —(暂留 Python) | 公开 |

> **前端分流现状(2026-07-09)**: Vue(`frontend`)与 React(`react-app`)的
> 登录 / 刷新 / 登出 / me / passkey(全套) / GitHub(登录·绑定·解绑·回调) /
> 后台 post 增删改 / visitor track 均已指向 Go `/api/v3`;注册 / 邮箱码 /
> 设置 / 头像上传仍走 Python `/api/v1/auth`(Go 端尚未实现注册邮箱码与
> 设置/上传)。
>
> **Go 端契约对齐**:登录 / 刷新 / passkey 登录 / GitHub 登录均会下发
> HttpOnly `refresh_token` cookie(与 Python 一致);前端静默刷新走
> `POST /v3/refresh-token`,token 优先取 body、缺失时回退 cookie。响应用
> 户字段铺平到 `data` 顶层(含 `github_bound` / `has_passkey` / `gender` /
> `email` / `mobile` / `photo`),与 Python `user_to_dict` 形状一致。

## 9. 变更日志

| 2026-07-09 | Go 端实现 GitHub OAuth 授权码登录 / 绑定 / 解绑(Redis state, 自动建用户, refresh cookie + access_token 重定向回前端)。 |
| 2026-07-09 | 前端(Vue + React)认证 / 后台 post / visitor track 调用切到 Go `/api/v3`;Go 端对齐 Python 契约:下发 refresh cookie、刷新支持 cookie、响应用户字段铺平 + `github_bound`。注册 / 邮箱码 / 设置 / 上传仍留 Python。 |
