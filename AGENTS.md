# AGENTS.md — Repository Operating Guide

> **Note:** 用户用中文提问时，请用中文回答

## Project Overview
- **App:** ReadingList — personal reading tracker with WeRead import
- **Architecture:** Full SPA (Vue 3 frontend + FastAPI backend)
- **Backend:** FastAPI (NEW :5555), Flask (LEGACY :5050), SQLAlchemy 2.0, Python 3.14+
- **Frontend:** Vue 3.5, TypeScript, Vite, Tailwind CSS v4, Pinia, Vue Router
- **Testing:** Pytest, Vitest, Playwright E2E

## Project Structure

```
backend/
├── app/               # FastAPI (NEW, :5555)
│   ├── routers/      # API: auth, blog, books, messages, public, users, weread
│   ├── models/       # SQLAlchemy 2.0
│   ├── schemas/      # Pydantic
│   └── dependencies/ # FastAPI DI
├── watchlist/        # Flask (LEGACY, :5050)
├── migrations/       # Alembic
└── dev.py            # FastAPI dev entry
frontend/             # Vue 3.5 SPA (:5173)
├── src/
│   ├── components/   # 16 Vue components
│   ├── views/        # 12 pages
│   ├── stores/       # Pinia
│   └── router/       # Vue Router
tests/                # Pytest + Playwright E2E
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| FastAPI endpoints | `backend/app/routers/` | New API at `/api/v1` |
| Flask endpoints | `backend/watchlist/api/` | Legacy API at `/api` |
| Vue components | `frontend/src/components/` | 16 components |
| Database models | `backend/app/models/` | SQLAlchemy 2.0 |
| Auth | `backend/app/routers/auth.py` | JWT-based |
| WeRead import | `backend/app/routers/weread.py` | Book import |

## Commands

### Backend
```bash
cd backend
ruff format . && ruff check .
python -m pytest
flask db migrate -m "desc" && flask db upgrade
python dev.py           # FastAPI on :5555
```

### Frontend
```bash
cd frontend
npm run dev             # Vite on :5173
npm run test:unit       # Vitest
npm run format && npm run lint
```

### E2E
```bash
# Requires backend (:5050) + frontend (:5173) running
npx playwright test
# Credentials: admin/admin
```

## Code Style

### Python (Ruff)
- **Target:** Python 3.14+, **Line:** 79, **Indent:** 4
- **Quotes:** Double, **Imports:** Absolute only
- **Order:** future → stdlib → third-party → first-party → local
- **Type hints:** `from __future__ import annotations`, use `X | None`

### SQLAlchemy 2.0
```python
class Book(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
```

### FastAPI (backend/app/)
```python
router = APIRouter(prefix="/api/v1")
@router.get("/books", response_model=list[BookResponse])
def get_books(user: User = Depends(get_current_user)): ...
```
- Routers at `/api/v1`, use `Depends()` for auth/DB
- Response models: Pydantic schemas in `schemas/`

### Flask-PyMongo (MongoDB)
- Collections: `message_board`, `posts`
```python
mongo.db.message_board.insert_one({"review": "...", "user_id": user.id})
mongo.db.message_board.find().sort("created_at", -1)
```

### Vue 3 / TypeScript
- **Indent:** 2, **Semicolons:** yes, **Quotes:** single (Vue), double (TS)
- **Components:** PascalCase, `<script setup lang="ts">`
- **Path:** `@/` → `./src/`
- **Dev proxy:** `/api/*` → `http://localhost:5050` (NOTE: FastAPI on `:5555`)

### Dependencies
- vue, vue-router, pinia, @vueuse/core, axios
- tailwindcss v4, @tiptap/vue-3, element-plus

## Testing

### Pytest (Backend)
```python
@pytest.fixture
def app():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite://"})
    with app.app_context(): db.create_all(); yield app; db.drop_all()

@pytest.fixture
def auth_client(client):
    client.post("/login", data={"username": "test", "password": "test"})
    return client
```

### Vitest (Frontend)
```typescript
import { mount } from "@vue/test-utils";
describe("C", () => { it("r", () => { expect(mount(C).text()).toContain("X"); }); });
```

### Playwright E2E
- `tests/*.spec.ts`, credentials: `admin/admin`

## Operational Rules
1. **Never modify:** `node_modules/`, `.venv/`, `backend/legacy/`
2. **After backend:** `ruff format . && ruff check .`
3. **After model:** `flask db migrate -m "desc" && flask db upgrade`
4. **After frontend:** `npm run format && npm run lint`
5. **Never commit:** `.env`, `node_modules/`, `.venv/`
6. **Check:** `lsp_diagnostics` before finishing

## Dev Workflow
- Backend: `cd backend && python dev.py` (:5555)
- Frontend: `cd frontend && npm run dev` (:5173)

## CI/CD
- None (manual deployment required)
