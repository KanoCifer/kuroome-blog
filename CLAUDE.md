# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🤖 Agent Rules
> Important: The following rules apply to development agents only
- When the user asks in Chinese, respond in Chinese
- When editing existing files, prefer the `edit` tool over the `write` tool
- After editing frontend code, run `pnpm type-check`. **Do NOT auto-run `pnpm build`** unless explicitly requested
- Before committing code, run the corresponding language's formatting and linting commands
- Do NOT add code comments unless explicitly asked
- Keep responses concise and technical; avoid conversational filler

---

## Project Overview
Full-stack reading list management and personal blog system built with FastAPI + Vue 3. Features include user authentication, book management, WeRead import, blog system, guestbook, RSS reader, AI assistant, and admin monitoring.

## Common Commands

### Backend (run from `backend/`)
```bash
python dev.py                           # Start dev server (:5555)
ruff format . && ruff check .           # Format + lint
ruff check . --fix                      # Auto-fix lint issues
alembic revision --autogenerate -m "desc" # Generate migration
alembic upgrade head                    # Run all migrations

# Testing
python -m pytest                                  # All tests
python -m pytest test/test_main.py -v             # Single file
python -m pytest test/core/test_config.py::test_config_loading -v # Single function
python -m pytest -k "config" -v                   # Filter by keyword
python -m pytest --tb=short                        # Short traceback
```

### Frontend (run from `frontend/`)
```bash
pnpm run dev                            # Start dev server (:5173)
pnpm run format                         # Prettier format
pnpm run lint                           # Oxlint + ESLint check
pnpm run type-check                     # TypeScript type-check (vue-tsc)
pnpm run build                          # Full build (type-check + compile)
pnpm run build-only                     # Build only (skip type-check)

# Testing
pnpm run test:unit                      # Vitest unit tests
pnpm run test:unit -- src/path/to/file.test.ts # Single file
pnpm run test:unit -- -t "should render title" # By test name
pnpm run test:unit -- src/path/to/file.test.ts -t "should render title" # File + test name
pnpm run test:unit -- src/path/to/file.test.ts:42 # File + line
npx playwright test                     # Playwright E2E
npx playwright test --headed            # E2E with browser UI
npx playwright test --debug             # Debug E2E
```

## Architecture
```
backend/app/
├── api/v1/              # API endpoints (auth, books, blog, messages, weread, rss, admin, ai, todos, monitor)
├── models/              # SQLAlchemy 2.0 (models.py) + MongoDB Beanie (beanie.py)
├── schemas/             # Pydantic schemas (per-domain: auth, book, blog, rss, etc.)
├── repositories/        # Data access layer
├── services/            # Business logic
├── core/                # Config, logging, AI agent
├── utils/               # Utility functions
├── tasks/               # Taskiq async tasks
└── main.py              # FastAPI entry point

frontend/src/
├── views/               # Page components
├── components/          # Reusable Vue components
├── auth/                # Authentication logic
├── service/            # API calls and business logic
├── stores/              # Pinia state management
├── router/              # Vue Router config
├── types/               # TypeScript type definitions
├── lib/                 # Third-party library wrappers
├── utils/               # Utility functions
├── layouts/             # Layout components
└── assets/              # Static assets
```

## Tech Stack
- **Backend**: FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, MongoDB (Beanie), Redis, Taskiq
- **Frontend**: Vue 3.5, TypeScript, Vite, Tailwind CSS v4, Pinia, shadcn-vue, motion-v
- **AI**: Agno
- **Ports**: Backend `:5555`, Frontend `:5173`

## Code Style

### Backend (Python)
- Ruff config (`ruff.toml`): 79 char line width, 4-space indent, double quotes, Python 3.14 target
- Type annotations: modern Python 3.14+ syntax (`list[str]` not `List[str]`)
- Naming: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants
- No bare `except:` — always specify exception type
- Google-style docstrings for all public functions/classes
- Use `async/await` for all database operations
- Import order: stdlib → third-party → local (isort)
- Absolute imports only: `from app.xxx import ...`
- Schemas split by domain in `app/schemas/` (auth, book, blog, rss, etc.)

### Frontend (Vue/TypeScript)
- Always use `<script setup lang="ts">` + Composition API (no Options API)
- Strict TypeScript: avoid `any`, use `unknown` + type guards
- Naming: `camelCase` for functions/variables, `PascalCase` for components/types
- Component files: `PascalCase.vue`, utility files: `camelCase.ts`
- Prefer Tailwind CSS utilities over custom CSS
- Use `@/` alias for imports from `frontend/src/`
- Package manager: `pnpm` only, never `npm`

### Error Handling
- Backend: raise custom exceptions in services, catch in API layer with proper HTTP status codes
- Frontend: use try/catch in async handlers, show user-friendly messages via notification store
- Never swallow errors silently — always log or notify

## Commit Guidelines
1. Backend pre-commit: `cd backend && ruff format . && ruff check .`
2. Frontend pre-commit: `cd frontend && pnpm format && pnpm lint && pnpm type-check`
3. Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`)
4. Branch naming: `feature/xxx`, `fix/xxx`, `refactor/xxx`
5. Never commit: `.env`, `node_modules/`, `.venv/`, `__pycache__/`, temp files
