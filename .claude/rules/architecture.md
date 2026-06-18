# Architecture

## Overview

- Backend: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie ODM (MongoDB) + Redis
- Frontend: Vue 3 (`frontend/`), Mobile: React 19 (`react-app/`)
- Domain terms: see [](../../docs/rules/domain.md)

## Dual-Frontend

Vue (`frontend/`) and React (`react-app/`) share backend services but maintain independent state stores. API contract changes must sync both ends.

## Backend Layering

`api -> service -> repository`

- `api/` — v1 stable, v2 next-version
- `services/` — business logic
- `repositories/` — data access
- `schemas/` — Pydantic
- `core/` — config, security, exceptions, logging
- `plugins/` — 可插拔模块

## API Conventions

- **Base path**: `/api/v1/` (core), `/api/v2/` (extensions)
- **Response format**: unified `{message, data}` envelope
- **Auth**: JWT access token + refresh token
- **Task queue**: Taskiq + RabbitMQ for async background jobs
