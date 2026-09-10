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
- `jti`: 唯一标识(8 位秒时间戳 hex + 12 位随机 hex,共 20 字符,**必需** — 用于多设备场景下区分同用户的不同 token;同时也是 Redis Hash 的 field)

> **为何需要 jti**: 没有 `jti` 时,相同 `sub` + 相同 `exp` 会产出完全相同的 JWT,refresh 轮换后旧 token 与新 token 无法区分,白名单校验形同虚设。

### Token 传输

| Token   | 位置                                   | 说明                                                |
| ------- | -------------------------------------- | --------------------------------------------------- |
| Access  | `Authorization: Bearer <token>` Header | 两端一致                                            |
| Refresh | JSON response body                     | 主路径                                              |
| Refresh | HttpOnly cookie                        | `secure`, `samesite=strict`, `domain=COOKIE_DOMAIN` |

### Key 设计

```
refresh:{user_id}  →  HASH
  field  = "<jti>"            # 20 字符,8 位秒时间戳 hex + 12 位随机 hex,可按字典序 ≈ 时间序
  value  = "<refresh_jwt>"    # refresh token 字符串
  TTL    = 7d                 # 整个 Hash 的过期时间,每次 HSet 后 Expire 续期
```

- **多设备模型**: 同一用户可同时持有多个 refresh token,每个 device 对应 Hash 的一个 field。Cookie 天然按浏览器/扩展隔离,前端无需改动。
- **设备上限**: 环境变量 `MAX_REFRESH_DEVICES` 控制,默认 5。`<= 0` 表示不限制。
- **驱逐策略**: 写入后若 `HLEN > MAX_REFRESH_DEVICES`,解析各 field 的 `iat`,按时间升序删最早的若干 field 使剩余 ≤ 上限。

### 生命周期

```
login / refresh / passkey-login / github-login
    → create_tokens()
        → redis.hset(f"refresh:{uid}", jti, refresh_jwt)
        → redis.expire(f"refresh:{uid}", 7d)
        → 若 HLEN > MAX_REFRESH_DEVICES → hdel 最早 iat 的 field

refresh-token request
    → redis.hget(f"refresh:{uid}", claims.jti)
    → 严格模式: field 必须存在且 == token,否则 401
    → 校验通过: create_tokens() 写入新 jti field → hdel 旧 jti field

logout (current device)
    → redis.hdel(f"refresh:{uid}", jti)        # 从 cookie 解析 jti
```

### 上线迁移 (一次性的不兼容变更)

旧版以 `SET refresh:{uid} <jwt>` 单字符串存储 refresh token,新版改为 `HSET refresh:{uid} <jti> <jwt>`。部署后老用户的 refresh token 在旧 SET 形态下走新 `HGET` 会拿到 `redis.Nil`,被判定为 401 → 用户被强制重新登录。

**SOP**:

```bash
# 部署前清掉旧 key (按用户量决定是否可接受强制登出)
redis-cli --scan --pattern 'refresh:*' | xargs -r redis-cli del
```

或者接受一次性强制重新登录(对线上用户可见)。无需代码层兼容。

### 配置 (env / yaml)

`MAX_REFRESH_DEVICES` 支持两种写法:

- 环境变量(平铺,推荐容器化部署): `MAX_REFRESH_DEVICES=5`
- YAML(嵌套,字段名必须平铺大写):

  ```yaml
  security:
    MAX_REFRESH_DEVICES: 5
  ```

低于或等于 0 表示不限制设备数。配置层显式回填(避免 viper.Unmarshal 把 defaultConfig 默认值清零)。

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
