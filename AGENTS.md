# AGENTS.md — Repository Operating Guide

> **Note:** 用户用中文提问时，请用中文回答

## Project Overview

- **Architecture:** Full SPA (Vue 3 frontend + FastAPI backend)
- **Backend:** FastAPI (:5555), SQLAlchemy 2.0+, Python 3.14+, Beanie (MongoDB)
- **Frontend:** Vue 3.5, TypeScript, Vite, Tailwind CSS v4+, Pinia, Vue Router

## Project Structure

```
backend/
├── app/              # FastAPI
│   ├── routers/      # API
│   ├── models/       # SQLAlchemy 2.0
│   ├── schemas/      # Pydantic
│   └── dependencies/ # FastAPI DI
├── migrations/       # Alembic
└── dev.py            # FastAPI dev entry
frontend/src/     # Vue 3.5 SPA
├── components/   # Vue components
├── views/        # pages
├── stores/       # Pinia
└── router/       # Vue Router
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| FastAPI endpoints | `backend/app/routers/` | API at `/api/v1` |
| Vue components | `frontend/src/components/` | components |
| Database models | `backend/app/models/` | SQLAlchemy 2.0 |
| Auth | `backend/app/routers/auth.py` | JWT-based and cookie |
| WeRead import | `backend/app/routers/weread.py` | Book import |

## Commands

### Backend
```bash
cd backend
ruff format . && ruff check .
python dev.py           # FastAPI on :5555
```

### Frontend
```bash
cd frontend
npm run dev             # Vite on :5173
npm run format && npm run lint
```

### FastAPI (backend/app/)
```python
router = APIRouter(prefix="/api/v1")
```

### Beanie (MongoDB)
- Collections: `message_board`, `posts`

### Vue 3 / TypeScript
- **Path:** `@/` 
- **Dev proxy:** `/api/v1/*` → `http://localhost:5555` (FastAPI)

### Dependencies
- vue, vue-router, pinia, @vueuse/core, axios
- tailwindcss v4, @tiptap/vue-3

## Operational Rules
1. **Never modify:** `node_modules/`, `.venv/`
2. **After backend:** `ruff format . && ruff check .`
4. **After frontend:** `npm run format && npm run lint`
5. **Never commit:** `.env`, `node_modules/`, `.venv/`
6. **Check:** `lsp_diagnostics` before finishing

## CI/CD
- None
