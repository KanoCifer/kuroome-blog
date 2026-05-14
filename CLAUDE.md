# CLAUDE.md

## 1) Agent Rules (Highest Priority)

- 用户使用中文提问时，使用中文回复。
- 编辑已有文件时，使用增量修改，不做无关重写。
- 修改前端代码后，必须运行：`pnpm run type-check`。
- **不要自动运行 `pnpm run build`**，除非用户明确要求。
- 提交前执行对应语言的格式化与 lint。
- 添加必要的代码注释和Docstring。
- 回复保持简洁、技术化。
- `/init` 类任务仅更新 `CLAUDE.md`，不要创建/修改 `AGENTS.md`。
- 编辑 CLAUDE.md 时，确保章节编号唯一，避免重复标题。
> 需要后端接口时 访问./03_Core_Modules.md，新增接口时更新该文件。

---

## 2) Project Overview

- Stack: FastAPI + Vue 3 (desktop) + React (mobile, `react-app/`) + TypeScript
- **双前端架构**: Vue (`frontend/`) + React (`react-app/`) 共享后端服务，但各自维护独立状态 Store；API 契约修改需同步两端

---

## 3) Commands

> Commands should run in the indicated directory.

### Backend

```bash
# sync dependencies & activate venv
uv sync
source .venv/bin/activate

# run dev server
uv run python3 dev.py

# migrations
uv run alembic revision --autogenerate -m "desc"
uv run alembic upgrade head

# format & lint
ruff format .
ruff check .

# run all tests
uv run pytest backend/ -v
uv run pytest backend/test/test_fishing_expert.py  # run specific test file
```

### Frontend (`cd frontend`)

```bash
pnpm run dev                      # dev server (:5173)
pnpm run build                    # build (only if user asks)
pnpm run build-only               # vite build only
pnpm run type-check               # vue-tsc type check (must run after modifying frontend)
pnpm run lint                     # oxlint + eslint
pnpm run format                   # prettier write
pnpm run test:unit               # vitest
```

### React-app (`cd react-app`)

```bash
pnpm run dev                      # dev server (:5174)
pnpm run build                    # tsc -b && vite build (only if user asks)
pnpm run build-only               # vite build only
pnpm run type-check               # tsc -b
pnpm run lint                     # eslint .
pnpm run lint:fix                 # eslint . --fix
```

## 4) Code Style Guidelines

### Zustand (React-app)

- 对象 Selector 需使用 `useShallow` 防止无限渲染
- 避免在 Selector 中返回新对象引用

### Backend (Python)

- Imports:
  - absolute imports only (`from app...`)
- Naming:
  - functions/variables: `snake_case`
  - classes: `PascalCase`
  - constants: `UPPER_SNAKE_CASE`
- Error handling:
  - never use bare `except:`
  - services raise domain errors, API layer maps HTTP responses
  - never swallow errors silently
- Async: prefer async/await for DB-related operations

### Frontend (Vue + TypeScript)

- Use `<script setup lang="ts">` + Composition API
- Type safety:
  - avoid `any`
  - use `unknown` + narrowing for external inputs
  - keep props/emits/store types explicit
- Naming:
  - variables/functions: `camelCase`
  - components/types: `PascalCase`
  - component file: `PascalCase.vue/tsx`
  - utility file: `camelCase.ts`
- Styling: prefer Tailwind utilities **NO** custom CSS
- Package manager: frontend uses `pnpm` only
- Error handling:
  - async flows use try/catch
  - narrow caught values before property access
  - route user-visible failures to notification flows
---

## 5) Key Files

- Backend entry: `backend/app/main.py`
- Frontend entry: `frontend/src/main.ts`
- React entry: `react-app/src/main.tsx`
- Config: `config/` (migration config: `mcporter.json`)
- Env files: `backend/.env`, `frontend/.env`, `react-app/.env`
- Core modules: `03_Core_Modules.md` (API documentation)
- **Changelog**: `react-app/src/data/changelog.json`

## 6) Environment Setup

Required env vars:
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — Application secret key

See `backend/.env`, `frontend/.env`, `react-app/.env` or `config/` for full list.

---

## 7) Architecture & Boundaries

Backend `app/` layout:
- `api/` — HTTP route handlers
  - `api/v1/` — stable API routes
  - `api/v2/` — next-version API routes
- `services/` — business logic
- `repositories/` — data access
- `schemas/` — Pydantic request/response models
- `tasks/` — background jobs

Frontend `src/` layout:
- `components/` — Vue components
- `stores/` — Pinia state stores
- `views/` — page-level components
- `api/` — API client wrappers
- `service/` — business logic layer

React-app `src/` layout (Zustand + hooks):
- `stores/` — Zustand state stores
- `hooks/` — custom hooks
- `views/` — page components
- `services/` — service layer
- `components/` — shared components

- Backend layering: `api -> service -> repository`
- Keep business logic in services; keep data access in repositories
- Keep request/response contracts in schemas

### API 契约变更流程

修改 `backend/app/schemas/` 后，需同步更新：
- `frontend/src/api/` — Vue 端 API client
- `react-app/src/services/` — React 端 service 层

双前端不共享 API client，契约变更需手动同步两端。