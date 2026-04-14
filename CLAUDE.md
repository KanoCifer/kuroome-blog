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

## Approach

- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.

---

## 2) Project Overview

- Stack: FastAPI + Vue 3 (desktop) + React (mobile, `react-app/`) + TypeScript

---

## 3) Commands

> Commands should run in the indicated directory.

### Backend

```bash
# run dev server
python3 dev.py

# migrations
alembic revision --autogenerate -m "desc"
alembic upgrade head

# format & lint
ruff format .
ruff check .
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
- Config: `config/` (environment configs)
- Core modules: `03_Core_Modules.md` (API documentation)

## 5) Environment Setup

Required env vars:
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — Application secret key

See `.env.example` or `config/` for full list.

---

## 6) Architecture & Boundaries

Backend `app/` layout:
- `api/` — HTTP route handlers
- `services/` — business logic
- `repositories/` — data access
- `schemas/` — Pydantic request/response models
- `tasks/` — background jobs

Frontend `src/` layout:
- `components/` — Vue components
- `stores/` — Pinia state stores
- `views/` — page-level components
- `api/` — API client wrappers

- Backend layering: `api -> service -> repository`
- Keep business logic in services; keep data access in repositories
- Keep request/response contracts in schemas