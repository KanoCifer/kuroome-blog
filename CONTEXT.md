# ReadingList — Domain Context

ReadingList（kanocifer.chat）是一个个人阅读追踪 + 博客系统，名称源于日语 "kuro neko"（黑猫）。

## Stack

- Backend: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie ODM (MongoDB) + Redis
- Desktop frontend: Vue 3.5 (`frontend/`)
- Mobile frontend: React 19 (`react-app/`)
- Task queue: Taskiq + RabbitMQ

## Domain Glossary

| 术语              | 含义                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Book              | 核心领域实体。存在全局书库中（PostgreSQL `book` 表），用户通过 `user_book` 关联持有个人副本和阅读状态 |
| Reading List      | 用户的书架概念，由 `user_book` 连接表实现。每个用户持有一组 Book，每本有独立的完成状态                |
| User              | 系统用户，支持密码/Passkey/GitHub OAuth 三种认证方式。`id == 1` 或 `id == 2` 为管理员                 |
| Post              | 博客文章，存储在 MongoDB，支持 Markdown/HTML 正文、分类、评论、点赞                                   |
| Subscription      | 订阅管理（v2），记录用户的付费订阅信息，支持多渠道到期提醒（Email/Bark/飞书）                         |
| DeviceTrack       | 设备追踪（v2），记录用户拥有的实体设备，支持里程碑提醒                                                |
| FishingRecord     | 钓鱼记录（MongoDB），包含天气/潮汐/用户反馈和专家评分（受 sklearn Ridge 模型校准）                    |
| WeRead (微信读书) | 外部书源，用户通过 cookie 导入微信读书书架                                                            |
| Admin             | 非角色系统。硬编码 `user.id in (1, 2)` 为管理员，可用于内容审核、部署触发                             |

## Key Constraints

- 同一本 Book（title + author 相同）在全局库中唯一，用户重复添加会报错
- Fishing index 计算分两步：专家规则公式 → Ridge 回归残差校准
- 双前端（Vue + React）维护独立状态 Store，API 契约修改必须在两端同步
- 管理员功能硬编码在`config.py`环境变量（`user.id in (1, 2)`），非 RBAC 系统

## Backend Layering

`api -> service -> repository`

- `api/` — HTTP route handlers（`api/v1/` stable, `api/v2/` next-version）
- `services/` — business logic
- `repositories/` — data access
- `schemas/` — Pydantic request/response models
- `core/` — config, security, exceptions, logging
- `tasks/` — background jobs

## API Conventions

- Base path: `/api/v1/`（core）, `/api/v2/`（extensions: subscription, device, fishing, weather）
- Response format: unified `{status, message, data, code}` envelope
- Auth: JWT access token (12h) + refresh token HTTP-only cookie (30d), optional Passkey / GitHub OAuth
- Concurrency: Todo writes use Redis lock; conflict returns HTTP 423
