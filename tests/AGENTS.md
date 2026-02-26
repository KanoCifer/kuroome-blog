# tests/ — Testing Suite

> Unified test directory: Pytest (backend) + Playwright (E2E). Vitest for frontend in `frontend/src/`.

## Overview

Mixed test types in single directory. Run with appropriate tooling per test type.

## Structure

```
tests/
├── test.py                    # Backend Pytest (SQLite in-memory)
├── test_comment_fix.py        # Standalone test script
├── example.spec.ts            # Playwright E2E example
├── test_comment_reply.spec.ts # Playwright E2E (Chinese)
└── __init__.py               # Package marker
```

## Running Tests

```bash
# Backend (Flask :5050 must run)
cd backend && python -m pytest

# Frontend unit (Vitest)
cd frontend && npm run test:unit

# E2E (backend :5050 + frontend :5173)
npx playwright test
npx playwright test --headed    # Visual mode
npx playwright test --debug    # Debug mode
```

## Backend Fixtures (test.py)

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

## E2E Credentials

- **User:** `admin`
- **Pass:** `admin`

## Notes

- Playwright tests: Chinese-language comments allowed
- Standalone scripts bypass fixtures (e.g., `test_comment_fix.py`)
- Pytest config in `backend/pyproject.toml`
- Vitest config in `frontend/vitest.config.ts`
