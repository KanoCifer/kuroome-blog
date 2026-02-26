# backend/app/ — FastAPI Backend (NEW)

> Modern FastAPI application. **In development** — gradually replacing `backend/watchlist/`.

## Overview

FastAPI v2 API at `/api/v1/*`. Uses SQLAlchemy 2.0, Pydantic schemas, dependency injection.

## Structure

```
app/
├── main.py              # FastAPI app factory, middleware, router registration
├── exceptions.py        # Custom exception handlers
├── routers/             # API endpoints
│   ├── auth.py         # Authentication (/auth)
│   ├── blog.py        # Blog posts (/blog)
│   ├── books.py       # Books management (/books)
│   ├── messages.py    # Message board (/messages)
│   ├── public.py      # Public endpoints (/public)
│   ├── users.py       # User management (/users)
│   └── weread.py     # WeRead import (/weread)
├── models/             # SQLAlchemy 2.0 models
├── schemas/            # Pydantic request/response schemas
└── dependencies/       # FastAPI dependency injection
```

## Entry Point

- **Dev:** `cd backend && python dev.py` → runs on `:5555`
- **Main:** `backend/app/main.py` — creates FastAPI app instance

## Router Pattern

```python
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import Book
from app.schemas import BookResponse

router = APIRouter(prefix="/api/v1")

@router.get("/books", response_model=list[BookResponse])
def get_books(user: User = Depends(get_current_user)):
    return books
```

## Conventions

- **Router prefix:** All routers mounted at `/api/v1`
- **Dependencies:** Use `Depends()` for auth, DB sessions
- **Response models:** Pydantic schemas in `schemas/`
- **Models:** SQLAlchemy 2.0 with `Mapped[]`, `mapped_column()`
- **Auth:** JWT-based, use `get_current_user` dependency

## Dev Proxy

Vite proxies `/api/v1/*` → `http://localhost:5555` (FastAPI)

## Status

- In development — not all endpoints migrated from Flask
- Legacy Flask API still active at `backend/watchlist/` on `:5050`
- New features go here, not in legacy

## Notes

- Run `ruff format . && ruff check .` after edits
- Use `from __future__ import annotations` for type hints
- Absolute imports only (`ban-relative-imports = "all"`)
