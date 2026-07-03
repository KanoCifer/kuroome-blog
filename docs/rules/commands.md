# Commands

## Backend

```bash
# run dev server
uv run python3 dev.py

# migrations
uv run alembic revision --autogenerate -m "desc"
uv run alembic upgrade head

# format & lint
ruff format . && ruff check .

# tests
cd backend && uv run pytest
```

## Frontend

```bash
pnpm run dev                      # dev server (:5173)
pnpm run build                    # build (only if user asks)
pnpm run build-only               # vite build only
pnpm run type-check
pnpm run lint                     # oxlint
pnpm run format                   # prettier
pnpm run test:unit                # vitest
```

## React-app

```bash
pnpm run dev                      # dev server (:5174)
pnpm run build                    # tsc -b && vite build (only if user asks)
pnpm run build-only               # vite build only
pnpm run type-check
pnpm run lint                     # oxlint
pnpm run format                   # prettier
pnpm run test:unit                # vitest
```
