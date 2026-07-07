# Environment & Key Files

## Key Files

- Backend entry: `backend/app/main.py` — FastAPI app, lifespan manager, Beanie registration
- Desktop entry: `frontend/src/main.ts` — Vue 3 app mount (Pinia + router + head)
- Mobile entry: `react-app/src/main.tsx` — React 19 app mount
- Brand themes: `packages/brand/themes/` — shared CSS variables (4 schemes × 41 vars)
- Brand prose: `packages/brand/prose.css` — `.prose` article styles (shared across both frontends)
- Go backend: `go-backend/` — Python 后端的 Go 重构（核心功能已实现，持续完善中）。详见 [go-backend.md](go-backend.md)
- Config: `config/` (migration, deployment scripts)

## Ports

| Service | Dev | Prod |
|---------|-----|------|
| Backend API | `:5555` | same |
| Vue App | `:5173` | Nginx served |
| React App | `:5174` | Nginx served (mobile UA) |

## Required Env Vars

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL **async** connection string (app runtime + Alembic 迁移均使用，异步引擎) |
| `DB_MIGRATE_URL` | 已定义但 **Alembic 实际读 `DATABASE_URL`**（`psycopg` 非依赖项）；迁移时只关注 `DATABASE_URL` |
| `SECRET_KEY` | JWT signing key (`openssl rand -hex 32`) |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `RABBITMQ_URL` | RabbitMQ connection string (Taskiq broker) |

## Tools & Versions

| Tool | Version | Manager |
|------|---------|---------|
| Python | 3.14+ | uv |
| Node | ^26.4 | pnpm |
| Go | 1.26 | — |
| PostgreSQL | 18 | — |
| MongoDB | 8 | — |
| Redis | 8 | — |
