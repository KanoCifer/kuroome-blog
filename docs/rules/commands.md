# Commands

## Backend

```bash
cd backend

# run dev server (:5555)
uv run python3 dev.py

# migrations
uv run alembic revision --autogenerate -m "desc"
uv run alembic upgrade head

# format & lint (pre-commit)
ruff format . && ruff check .
ruff check . --fix              # auto-fix

# tests
uv run pytest                                  # all tests
uv run pytest test/test_main.py -v             # single file
uv run pytest test/core/test_config.py::test_config_loading -v  # single test
uv run pytest -k "config" -v                  # filter by keyword
uv run pytest --tb=short                      # short traceback
```

## Go Backend

```bash
cd go-backend

go run ./cmd/server          # 启动 -> 127.0.0.1:5555
go test ./...                # 全量单测
gofmt -w .                   # 格式化
go vet ./...                 # 静态检查
```

## Desktop (Vue)

```bash
cd frontend
pnpm install                        # install deps
pnpm run dev                        # dev server (:5173)
pnpm run build                      # tsc -b && vite build (only if user asks)
pnpm run build-only                 # vite build only
pnpm run type-check                 # vue-tsc --noEmit
pnpm run lint                       # oxlint
pnpm run lint:fix                   # oxlint auto-fix
pnpm run format                     # prettier (auto-sorts tailwind classes)
pnpm run test:unit                  # vitest
pnpm run test:unit -- --run         # single run (not watch mode)
```

## Mobile (React)

```bash
cd react-app
pnpm install                        # install deps
pnpm run dev                        # dev server (:5174)
pnpm run build                      # tsc -b && vite build (only if user asks)
pnpm run build-only                 # vite build only
pnpm run type-check                 # tsc --noEmit
pnpm run lint                       # oxlint
pnpm run lint:fix                   # oxlint auto-fix
pnpm run format                     # prettier
pnpm run test:unit                  # vitest run
```
