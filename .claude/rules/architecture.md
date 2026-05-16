# Architecture

## Overview

- Stack: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie ODM (MongoDB) + Redis
- Desktop: Vue 3 (`frontend/`), Mobile: React 19 (`react-app/`)
- Domain terms: see [domain.md](domain.md)

## Dual-Frontend

Vue (`frontend/`) and React (`react-app/`) share backend services but maintain independent state stores. API contract changes must sync both ends.

## Backend Layering

`api -> service -> repository`

- `api/` — HTTP route handlers (`api/v1/` stable, `api/v2/` next-version)
- `services/` — business logic
- `repositories/` — data access
- `schemas/` — Pydantic request/response models
- `core/` — config, security, exceptions, logging
- `tasks/` — background jobs (Taskiq + APScheduler)

## API Conventions

- **Base path**: `/api/v1/` (core), `/api/v2/` (extensions: subscription, device, fishing, weather)
- **Response format**: unified `{status, message, data, code}` envelope
- **Auth**: JWT access token (12h) + refresh token HTTP-only cookie (30d), optional Passkey / GitHub OAuth
- **Concurrency**: Todo writes use Redis lock; conflict returns HTTP 423
- **Task queue**: Taskiq + RabbitMQ for async background jobs

## Frontend `src/` Layout

- `components/` — Vue components
- `stores/` — Pinia state stores
- `views/` — page-level components
- `api/` — API client wrappers
- `service/` — business logic layer

## React-app `src/` Layout (Zustand + hooks)

- `stores/` — Zustand state stores
- `hooks/` — custom hooks
- `views/` — page components
- `services/` — service layer
- `components/` — shared components

## Auto-Format Hook

`.claude/settings.local.json` auto-formats edits via Prettier (frontend/react-app) and Ruff (backend). Do not double-format.

## API Contract Change Flow

After modifying `backend/app/schemas/`, sync both frontends:
- `frontend/src/api/` — Vue API client
- `react-app/src/services/` — React service layer

## Key Constraints

- 同一本 Book（title + author 相同）在全局库中唯一，用户重复添加会报错
- Fishing index 计算分两步：专家规则公式 → Ridge 回归残差校准
- 双前端（Vue + React）维护独立状态 Store，API 契约修改必须在两端同步
- 管理员功能硬编码（`user.id in (1, 2)`），非 RBAC 系统
