# CLAUDE.md

Repository guidance for agentic coding assistants in this project.

## 1) Agent Rules (Highest Priority)

- 用户使用中文提问时，使用中文回复。
- 编辑已有文件时，使用增量修改，不做无关重写。
- 修改前端代码后，必须运行：`pnpm run type-check`。
- **不要自动运行 `pnpm run build`**，除非用户明确要求。
- 提交前执行对应语言的格式化与 lint。
- 未经用户要求，不主动添加代码注释。
- 回复保持简洁、技术化。
- `/init-deep` 类任务仅更新 `CLAUDE.md`，不要创建/修改 `AGENTS.md`。

---

## 2) Project Overview

- Stack: FastAPI + Vue 3 + TypeScript
- Ports: backend `:5555`, frontend `:5173`
- Main domains: auth, books, blog, messages, RSS, AI, admin/monitoring

### Key directories

```text
backend/
  app/api/v1/        # route layer
  app/services/      # business logic
  app/repositories/  # data access
  app/schemas/       # request/response contracts
  app/models/        # SQLAlchemy + Beanie
  app/core/          # config/security/logging
  app/tasks/         # async jobs
  app/main.py        # FastAPI entry
  test/              # pytest tests
  dev.py             # backend dev entry

frontend/
  src/views/         # page-level components
  src/components/    # reusable UI
  src/auth/          # auth logic
  src/service/       # API adapters
  src/stores/        # Pinia stores
  src/router/        # route and guards
  src/types/         # shared TS types
  package.json       # command entry
  vitest.config.ts   # unit test config

scripts/
  package.json       # utility scripts
```

---

## 3) Build / Lint / Test Commands

> Commands should run in the indicated directory.

### Backend (`cd backend`)

```bash
# run dev server
python dev.py

# format + lint
ruff format . && ruff check .
ruff check . --fix

# migrations
alembic revision --autogenerate -m "desc"
alembic upgrade head

# tests
python -m pytest
python -m pytest test/test_main.py -v
python -m pytest test/core/test_config.py::test_config_loading -v
python -m pytest -k "config" -v
python -m pytest --tb=short
```

### Frontend (`cd frontend`)

```bash
# dev and quality
pnpm run dev
pnpm run format
pnpm run lint
pnpm run type-check

# build (only if user asks)
pnpm run build
pnpm run build-only

# vitest
pnpm run test:unit
pnpm run test:unit -- src/path/to/file.test.ts
pnpm run test:unit -- -t "should render title"
pnpm run test:unit -- src/path/to/file.test.ts -t "should render title"
pnpm run test:unit -- src/path/to/file.test.ts:42

# playwright
npx playwright test
npx playwright test --headed
npx playwright test --debug
npx playwright test tests/foo.spec.ts:42
npx playwright test -g "should login"
```

### Scripts (`cd scripts`)

```bash
npm run parse-ua
```

### Single-test strategy

- Pytest: prefer exact node id (`file::test_name`).
- Vitest: prefer `file:line`, fallback to `-t`.
- Playwright: prefer `file:line`, fallback to `-g`.
- Use fuzzy matching only when exact location is unknown.

---

## 4) Code Style Guidelines

### Backend (Python)

- Python: `>=3.14`; Ruff target: `py314`
- Formatting: line length `79`, 4-space indent, double quotes, LF
- Imports:
  - absolute imports only (`from app...`)
  - no relative imports
  - order: stdlib → third-party → first-party/local
- Types: modern annotations (`list[str]`, `dict[str, str]`, `A | B`)
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
  - component file: `PascalCase.vue`
  - utility file: `camelCase.ts`
- Imports: use alias `@/` for `frontend/src/*`
- Styling: prefer Tailwind utilities
- Package manager: frontend uses `pnpm` only
- Error handling:
  - async flows use try/catch
  - narrow caught values before property access
  - route user-visible failures to notification flows

---

## 5) Architecture & Boundaries

- Backend layering: `api -> service -> repository`
- Keep business logic in services; keep data access in repositories
- Keep request/response contracts in schemas
- Frontend layering:
  - `views/`: page composition
  - `components/`: reusable UI
  - `stores/`: state management
  - `service/`: API communication
  - `router/`: route definitions and guards

## 6) Cursor / Copilot Rules Status

Checked in repository:

- `.cursorrules`: not found
- `.cursor/rules/`: not found
- `.github/copilot-instructions.md`: not found

If these files are added later, merge their explicit constraints here.
