# Backend Layer Responsibility Reference

总结各层的职责边界、判断标准和实际案例。

---

## 三层架构

```
api/  ──→  services/  ──→  repositories/
接口层      业务层          数据访问层
```

依赖方向：api → service → repo。不可逆。

---

## API 层 (`api/`)

**职责：HTTP 展示 —— 把 HTTP 请求翻译成服务调用，把服务结果翻译成 HTTP 响应。**

| 属于 API 层                                          | 不属于                               |
| ---------------------------------------------------- | ------------------------------------ |
| 路由定义、路径参数解析                               | 业务规则的 if/else                   |
| 请求体校验（Pydantic schema → 调用 service）         | 直接调 httpx / requests 访问外部 API |
| 构造 HTTP Response（JSONResponse、RedirectResponse） | 构造 SQL / ODM 查询                  |
| 设置/删除 Cookie                                     | Token 创建逻辑                       |
| Session 读写（存储 state、code_verifier 等）         | 判断用户是否到期                     |
| 速率限制（`@limiter.limit`）                         | 数据聚合计算                         |
| 认证依赖注入（`Depends(manager)`）                   | 密码验证                             |
| 领域异常 → HTTP 状态码映射                           | 发送邮件/通知                        |

**判断标准：** 换成 GraphQL 或 gRPC 时，这层全部重写，其余层不变。

### 案例

```python
# ✅ API 层做：catch 领域异常，映射 HTTP 响应
try:
    access_token = await user_service.exchange_github_code(code, code_verifier)
except GitHubAuthError as e:
    return RedirectResponse(url=f"/login?error={e.error_code}")

# ✅ API 层做：cookie 设置（纯 HTTP 概念）
response.set_cookie(key="refresh_token", value=token, httponly=True)

# ❌ API 层不该做：直接调外部 API
async with httpx.AsyncClient() as client:
    token_resp = await client.post("https://github.com/login/oauth/access_token", ...)
```

---

## Service 层 (`services/`)

**职责：业务逻辑 —— 领域规则的唯一归属地。**

| 属于 Service 层                              | 不属于                                        |
| -------------------------------------------- | --------------------------------------------- |
| 业务规则（"到期 = active 且过期的账单日"）   | SQL / ODM 查询语句                            |
| 编排多个 repo 或外部服务                     | 设置 Cookie                                   |
| 领域计算（里程碑窗口、评分算法）             | 构造 HTTP Response                            |
| Token 创建和验证                             | 直接读写 HTTP Session                         |
| 密码验证、PKCE 挑战生成                      | 纯透传（一行 `return await self.repo.xxx()`） |
| 发送验证码（生成码 + 存 Redis + 调任务队列） | 字符串解析（应放 utils）                      |
| 数据聚合（结合多个数据源做出决策）           | 文件 I/O（应放 utils）                        |

**判断标准：** 改数据库（MySQL → MongoDB）时，这层不改；改业务规则时，只改这层。

### 案例

```python
# ✅ Service 层做：业务规则
async def get_due_subscriptions(self):
    active_subs = await self.sub_repo.get_active_subscriptions()
    now = datetime.now(UTC)
    return [s for s in active_subs if s.next_billing_date <= now]

# ✅ Service 层做：领域计算
for milestone in milestones:
    if days_owned <= milestone <= future_days:
        upcoming.append(device)

# ❌ Service 层不该做：透传
async def get_subscription_by_id(self, sub_id):
    return await self.sub_repo.get_subscription_by_id(sub_id)  # 删除这个方法，调用方直接用 repo
```

### 关于"薄服务"的误区

服务层不是"重"才好。当服务方法 = 一行 repo 调用时，它是多余的中间层。此时有两个选择：

- **如果调用方是 API 层**：API 层直接依赖 repo（跳过服务），服务方法删除
- **如果未来会有业务规则叠加**：保留服务方法作为接缝点，但现在就写规则

本次重构中，`SubService` 和 `DeviceService` 的大部分方法仍是透传（CRUD），但 `get_due_subscriptions` 和 `get_upcoming_milestone_devices` 现在包含了真正的领域逻辑。

---

## Repository 层 (`repositories/`)

**职责：纯数据访问 —— 把数据从存储介质中拿出来 / 放回去。**

| 属于 Repo 层                            | 不属于                            |
| --------------------------------------- | --------------------------------- |
| CRUD 操作（增删改查）                   | 业务规则过滤                      |
| 简单列过滤（`WHERE status = 'active'`） | 日期/时间相关的领域判断           |
| 排序（`ORDER BY`）                      | 计算（里程碑窗口、评分残差）      |
| 分页（`LIMIT / OFFSET`）                | 决策（"是否该发通知"）            |
| 关联加载（`selectinload`）              | 数据转换（日期字符串 → datetime） |
| 聚合查询（`COUNT`）                     | 发送通知、调用外部 API            |

**判断标准：** 换一个存储后端（PostgreSQL → MongoDB）时，这层全部重写，其余层不变。

### 案例

```python
# ✅ Repo 层做：简单数据查询
stmt = select(Subscription).where(Subscription.status == "active")
result = await self.session.execute(stmt)

# ✅ Repo 层做：纯 CRUD
subscription = Subscription(user_id=user_id, **sub_data)
self.session.add(subscription)

# ❌ Repo 层不该做：业务规则
stmt = select(Subscription).where(
    Subscription.status == "active",
    Subscription.next_billing_date <= datetime.now(UTC),  # "到期"是业务概念
)

# ❌ Repo 层不该做：领域计算
for device in devices:
    days_owned = (today - device.purchase_date.date()).days  # 里程碑计算属于业务
```

### 关于接口诚实

Repo 的 `__init__` 参数和实际使用必须一致。`FishingRepo.__init__` 接受 `session: AsyncSession` 但全部方法用 Beanie ODM 操作 MongoDB——这是接口谎言。要么移除参数，要么让它真的用到。

---

## 横切关注点

### 异常

- **定义**：`core/exceptions.py`（领域异常，如 `GitHubAuthError`、`APIError`）
- **抛出**：Service 层抛领域异常
- **捕获和映射**：API 层 catch 领域异常，映射为 HTTP 状态码 / RedirectResponse

```
Service:  raise GitHubAuthError("github_timeout")
API:      except GitHubAuthError as e: return RedirectResponse(f"/login?error={e.error_code}")
```

### 配置

- `settings.ADMIN_USER_IDS` — 配置驱动，不在代码中硬编码 ID 白名单
- 环境变量 / `.env` 文件管理

---

## 快速判断表

| 场景                                     | 放哪层         | 原因                      |
| ---------------------------------------- | -------------- | ------------------------- |
| 过滤 status == "active"                  | Repo           | 简单列过滤，非业务规则    |
| 过滤"已到期"（next_billing_date <= now） | Service        | "到期"是业务概念          |
| 里程碑天数计算                           | Service        | 领域计算逻辑              |
| GitHub OAuth token 交换                  | Service        | 外部 API 调用属于业务编排 |
| cookie 设置                              | API            | 纯 HTTP 概念              |
| 构造 JSONResponse                        | API            | 展示层职责                |
| 密码哈希验证                             | Service        | 安全策略是业务规则        |
| 用户 ID 查询                             | Repo           | 纯数据访问                |
| "哪些用户是管理员"                       | Config/Service | 授权策略应配置驱动        |
