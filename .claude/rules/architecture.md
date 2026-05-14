# Architecture

## Overview

- Stack: FastAPI + Vue 3 (desktop) + React (mobile, `react-app/`) + TypeScript
- Dual-frontend: Vue (`frontend/`) and React (`react-app/`) share backend services but maintain independent state stores. API contract changes must sync both ends.

## Backend Layering

`api -> service -> repository`

- `api/` — HTTP route handlers (`api/v1/` stable, `api/v2/` next-version)
- `services/` — business logic
- `repositories/` — data access
- `schemas/` — Pydantic request/response models
- `core/` — config, security, exceptions, logging
- `tasks/` — background jobs (Taskiq + APScheduler)

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
