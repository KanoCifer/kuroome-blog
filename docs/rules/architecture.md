# Architecture

## Overview

- Backend: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie ODM (MongoDB) + Redis 8 + structlog（双文件路由 + event 表落库）; Go 后端 (`go-backend/`) 使用 slog + 同构 `.env`，路由 `/api/v3/*`，逐步承载认证/Blog/Admin
- Desktop: Vue 3.5 (`frontend/`) + Vite 8 + Tailwind CSS v4 + Pinia 3
- Mobile: React 19 (`react-app/`) + Vite 8 + Tailwind CSS v4 + Zustand 5
- Domain terms: see [domain.md](domain.md)

## Dual-Frontend

Vue (`frontend/`) and React (`react-app/`) share backend services but maintain independent state stores. API contract changes must sync both ends:

- Backend schema change → sync `frontend/src/features/<domain>/api/` and `react-app/src/services/`
- Both use `packages/brand/` for shared theme tokens and prose styles

### Vue 前端目录组织

`frontend/src/` 采用 **features/ 按业务域聚合**（详见 [code-style.md](code-style.md)）：

- `features/<domain>/` — 每个业务域把路由页（域根 `<View>.vue`）+ `api/` + `composables/` + `stores/` + `types/` + `components/` 收拢在一起；子目录内部**扁平**（禁止 `views/`、`components/<subdir>/`、`composables/<subdir>/` 等嵌套），通过 `index.ts` 桶导出；新增域在 `features/` 下建目录，禁止散落在顶层
- `shared/` — 跨域基础设施（`api/` 聚合共享 gateway、`auth/` 全局认证、`components/` 复用 UI、`composables/` 跨域 hooks、`stores/` 跨域 store）
- `layouts/` `router/` `lib/` `utils/` `constants/` — 全局基础设施，不迁入 features
- 顶层已清空 `views/` `auth/` `components/` `composables/` `stores/` `api/` `plugins/`

## Data Layer

- **PostgreSQL** (asyncpg): core relational data — users, profiles, subscriptions, devices
- **MongoDB** (Beanie): document data — posts, RSS articles, moments, changelogs, fishing records, dev tasks, friend links
- **Redis 8**: caching (`@redis_cache` decorator), sessions, visitor tracking, distributed locks
- **RabbitMQ** (Taskiq): async task queue — RSS refresh, email, boot notifications, log persistence

> Gotcha: `DATABASE_URL` (asyncpg) 应用与迁移均使用；`DB_MIGRATE_URL` 虽定义但 Alembic 实际读 `DATABASE_URL`（`psycopg` 非依赖项）。迁移不要依赖 `DB_MIGRATE_URL`。

## Backend Layering

`api -> service -> repository`

- `api/v1/` — stable endpoints (auth, blog, moments, publish, RSS, monitor, admin, public)
- `api/v2/` — extension endpoints (fishing, device, subscription, weather, weread, LLM, system, devtasks, friend-links)
- `services/` — business logic, composes repos and external deps
- `repositories/` — data access, isolates SQL/ORM details
- `schemas/` — Pydantic request/response models per domain
- `core/` — config, security, exceptions, response helpers, AI agent
- `plugins/` — cache (`@redis_cache`) and notification modules

> Beanie registration: new MongoDB document models must be added to `main.py`'s `document_models` list or the collection won't be created.

## API Conventions

- **Base path**: `/api/v1/` (stable), `/api/v2/` (extensions), `/api/v3/` (Go 后端: 鉴权/Blog/Admin/DevTask/Monitor 等已迁移路由)
- **Response format**: unified `APIResponse(message, data)` envelope
- **Auth**: JWT (24h access + 7d refresh) + SameSite Cookie (CSRF removed in favor of SameSite)
- **Task queue**: Taskiq + RabbitMQ for async background jobs
- **Logging**: structlog → stdlib `ProcessorFormatter` → 双文件 (info/error)；关键业务事件走 `event` 表（startup/deploy/notify_failure），不再通过 HTTP 端点分页查询日志
