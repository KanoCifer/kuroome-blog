# Commands

> Run commands in the indicated directory.

## Backend

```bash
# sync dependencies & activate venv
cd backend && uv sync && source .venv/bin/activate

# run dev server
uv run python3 dev.py

# migrations
uv run alembic revision --autogenerate -m "desc"
uv run alembic upgrade head

# format & lint
ruff format . && ruff check .

# run all tests
uv run pytest backend/ -v
uv run pytest backend/test/test_fishing_expert.py  # specific file
```

## Frontend (`cd frontend`)

```bash
pnpm run dev                      # dev server (:5173)
pnpm run build                    # build (only if user asks)
pnpm run build-only               # vite build only
pnpm run type-check               # vue-tsc (must run after modifying frontend)
pnpm run lint                     # oxlint + eslint
pnpm run format                   # prettier write
pnpm run test:unit                # vitest
```

## React-app (`cd react-app`)

```bash
pnpm run dev                      # dev server (:5174)
pnpm run build                    # tsc -b && vite build (only if user asks)
pnpm run build-only               # vite build only
pnpm run type-check               # tsc -b
pnpm run lint                     # eslint .
pnpm run lint:fix                 # eslint . --fix
pnpm run format                   # prettier --write src/
```

## Verification

Run `/verify` to execute all format/lint/type-check at once.
