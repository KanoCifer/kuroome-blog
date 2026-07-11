# ReadingList — Domain Context

ReadingList（kanocifer.chat）是一个个人阅读追踪 + 博客系统，名称源于日语 "kuro neko"（黑猫）。

## Stack

- Backend: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie ODM (MongoDB) + Redis + slog 结构化日志（event 表落库）
- Go Backend: Gin + slog + Redis，路由前缀 `/api/v3/*`，承载认证/Blog/Admin（逐步替代 Python 层）
- Desktop frontend: Vue 3.5 (`frontend/`)
- Mobile frontend: React 19 (`react-app/`)
- Task queue: Taskiq + RabbitMQ

## Domain Glossary

| 术语              | 含义                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| User              | 系统用户，支持密码/Passkey/GitHub OAuth 三种认证方式。`ADMIN_USER_IDS`（默认 `[1, 2]`）为管理员 |
| Profile           | 用户个人资料，与 User 一对一关联（PostgreSQL）                                                  |
| Post              | 博客文章（MongoDB），Markdown 正文、分类、评论（Twikoo）、点赞                                  |
| Moment (碎碎念)   | 轻量动态（MongoDB），类似 Twitter。支持图片/链接/书籍/引用附件、标签、心情、定位、可见性控制    |
| Subscription      | 付费订阅追踪（PostgreSQL），账单周期、月度费用、多渠道到期提醒（Email/Bark/飞书）               |
| Device            | 设备资产跟踪（PostgreSQL），里程碑提醒（100 天/1 年等）、成本分析                               |
| FishingRecord     | 钓鱼记录（MongoDB），天气/潮汐/用户反馈 + 专家评分（9 特征加权）+ ML 残差校准（Ridge 回归）     |
| FishingModelMeta  | 钓鱼 ML 模型元数据（MongoDB），版本/训练时间/权重持久化                                         |
| WeRead (微信读书) | 外部书源（MongoDB），用户通过 token 导入书架。`WereadBook`/`UserBook`/`Archive` 文档模型        |
| RssArticle        | RSS 订阅文章（MongoDB），聚合/已读标记                                                          |
| Changelog         | 版本更新日志（MongoDB），双端通过 API 读取                                                      |
| DevTask           | 开发任务看板（MongoDB），Kanban 三列排序                                                        |
| FriendLinks       | 友链（MongoDB），每日精选轮换                                                                   |
| GalleryImage      | 图库图片，PostgreSQL `pic` 表 + Redis 缓存，瀑布流展示                                          |
| Event             | 系统事件（PostgreSQL `event` 表），承载 startup / deploy / notify_failure 等业务事件            |
| Admin             | 非角色系统。硬编码 `user.id in ADMIN_USER_IDS` 为管理员，用于内容审核、部署触发、系统监控       |

## Removed Domains

| 术语 | 备注                                                      |
| ---- | --------------------------------------------------------- |
| Book | 原 PostgreSQL `book` 表，已移除，由 WeRead 替代（v3.2.0） |
| Memo | 备忘录功能，已从双端移除（v3.7.0）                        |

## Key Constraints

- Book 领域实体已移除（v3.2.0），由 WeRead 替代；原 PostgreSQL `book` 表不再使用
- Fishing index 计算分两步：专家规则（9 特征加权）→ Ridge 回归残差校准
- 双前端（Vue + React）维护独立状态 Store，API 契约修改必须在两端同步
- 管理员功能硬编码在 `ADMIN_USER_IDS` 环境变量（非 RBAC，非 DB 字段）；Go 端 AdminMiddleware 必须在 AuthMiddleware 之后
- 双后端共享同一 Postgres 用户库与 Redis；JWT 签发/refresh 轮换/登出必须在两端一致（详见 auth.md）
- Go 端注册尚未实现邮箱验证码，注册/邮箱码/设置/头像上传仍走 Python `/api/v1/auth`

## Backend Layering

### Python (FastAPI, `/api/v1` + `/api/v2`)

`api -> service -> repository`，session 已通过 DI 迁移为方法参数（非构造函数注入）

- `api/` — HTTP route handlers（`api/v1/` stable, `api/v2/` extensions）
- `services/` — business logic
- `repositories/` — data access（session 参数化）
- `schemas/` — Pydantic request/response models
- `core/` — config, security, exceptions, logging
- `tasks/` — background jobs (Taskiq + RabbitMQ)

### Go (Gin, `/api/v3`)

`handler -> service -> repository -> model`，AppState 构造函数注入

- `internal/router/` — 路由注册
- `internal/handler/` — HTTP handlers
- `internal/service/` — business logic
- `internal/repository/` — data access
- `internal/app/` — AppState DI 容器
- `internal/middleware/` — CORS、限流、access log、admin
- `internal/logger/` — slog（双文件 + trace_id + lumberjack）

## API Conventions

- Base path: `/api/v1/`（core）, `/api/v2/`（extensions）, `/api/v3/`（Go 后端: auth/blog/admin）
- Response format: unified `{message, data}` envelope
- Auth: JWT access token (1h) + refresh token HTTP-only cookie (7d), Passkey / GitHub OAuth; Redis refresh rotation（单设备模型）
- Concurrency: Todo writes use Redis lock; conflict returns HTTP 423
- Logging: Python 端 structlog + event 表；Go 端 slog 双文件路由
