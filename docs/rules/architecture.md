# Architecture

## Overview

- Backend: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie ODM (MongoDB) + Redis 8 + structlog (Taskiq 异步落库)
- Desktop: Vue 3.5 (`frontend/`) + Vite 8 + Tailwind CSS v4 + Pinia 3
- Mobile: React 19 (`react-app/`) + Vite 8 + Tailwind CSS v4 + Zustand 5
- Domain terms: see [domain.md](domain.md)

## Dual-Frontend

Vue (`frontend/`) and React (`react-app/`) share backend services but maintain independent state stores. API contract changes must sync both ends:

- Backend schema change → sync `frontend/src/api/` and `react-app/src/services/`
- Both use `packages/brand/` for shared theme tokens and prose styles

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

- **Base path**: `/api/v1/` (stable), `/api/v2/` (extensions)
- **Response format**: unified `APIResponse(message, data)` envelope
- **Auth**: JWT (12h access + 30d refresh) + SameSite Cookie (CSRF removed in favor of SameSite)
- **Task queue**: Taskiq + RabbitMQ for async background jobs
- **Logging**: structlog → stdlib `ProcessorFormatter` → three files (info/error/access) + DB persist (WARNING+ or `persist=True`)
