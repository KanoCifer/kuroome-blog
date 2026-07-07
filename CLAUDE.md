# CLAUDE.md

## 1) Rules (Highest Priority)

- 修改前端代码后，必须运行类型检查：
  - Vue: `cd frontend && pnpm type-check`
  - React: `cd react-app && pnpm type-check`
- **提交前必跑**：(1) 改前端 → `pnpm type-check` (2) 改后端 → `ruff check .` (3) 各自语言的 lint + format
- 样式必须使用语义化 Tailwind class，禁止硬编码颜色。
- 用户没有特殊要求，禁止执行`pnpm build`
- 后端使用 `uv` 管理依赖。

## 2) Project Overview

- kanocifer.chat 个人网站。名称源于日语 "kuro neko"（黑猫）
- Backend: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie (MongoDB) + Redis
- Desktop: Vue 3 (`frontend/`), Mobile: React 19 (`react-app/`)
- **双前端架构**: Vue + React 共享后端服务，各自维护独立状态 Store；API 契约修改需同步两端
- 修改 `backend/app/schemas/` 后，必须同步 `frontend/src/api/` 和 `react-app/src/services/`。
- 缓存模块在 `app/plugins/cache/`。端点用 `@redis_cache(ttl=N, exclude=[...])`，`exclude` 跳过 Depends 参数（不参与 cache key）
- **`composables/` 按域分目录**（`shared/ card/ article/ pic/ rss/ weread/ comment/ todo/`），与 `views/` `components/` 分域策略一致；每个子目录用 `index.ts` 桶导出，跨域 import 走桶 `from '@/composables/<domain>'`，不要直接指向具体文件

## Go Backend (go-backend/)

`go-backend/` 是 Python `backend/` 的 Go 重构(早期阶段)。

- **运行**:`cd go-backend && go run ./cmd/server`,启动 `127.0.0.1:5555`
- **路由前缀**:`/api/v3/*`
- **框架**:Gin GORM(Postgre) + MongoDB driver(v2) + go-redis(v9);JWT HS256 + bcrypt;配置用 Viper
- **分层架构**:`handler → service → repository → model`,响应统一包 `internal/response/`(`Success` / `APIError` 封装了 `{data, message}` 信封);handler 通过接口(`UserService`/`AdminService`)解耦,便于测试 mock
- **命名对齐**:与 Python 后端共享同一套环境变量名(`DATABASE_URL / SECRET_KEY / REDIS_URL / MONGO_URI / PORT` 等),可直接复用 `.env`
- **鉴权差异(已对齐)**:admin 鉴权走 `middleware.AdminMiddleware()`,依据 `ADMIN_USER_IDS` 配置(非硬编码);Go `User` model 无 `is_admin` 字段,登录态 `is_admin` 由 `ADMIN_USER_IDS` 判定。注册时 `email_code` 真正校验 Redis `signup_code:{email}`,非法 admin post id 返回 400
- **测试**:`cd go-backend && go test ./...`;handler/service/dto/middleware/jwt 均有覆盖(含 admin 端)。**注意**:`internal/router/` 等支架目录曾记载为空,现已随实现填充
- **已知遗留**:`internal/repository/mongo/`、`internal/domain/`、`internal/infra/` 仍为空支架;Mongo repo 在 `internal/repository/postgres/`(误置于 postgres 包)与 `internal/mongo/document/` 下

## 3) Environment & Gotchas

- **双数据库 URL**：`DATABASE_URL`（asyncpg，应用使用）与 `DB_MIGRATE_URL`（psycopg 同步，Alembic 迁移使用）。迁移时用错 URL 会失败。
- **Beanie 模型注册**：新增 MongoDB 文档模型必须加入 `main.py` 的 `init_beanie()` 的 `document_models` 列表，否则不会创建集合。
- **Ruff**：`ban-relative-imports = "all"`（禁止相对导入，只用绝对导入）；`line-length = 79`；允许中文字符。
- **Prettier**：`prettier-plugin-tailwindcss` 自动排序 Tailwind class。
- **端口**：后端 `127.0.0.1:5555`（非 8000），前端通过 Vite proxy 转发 `/api/`。
- **工具链**：Python ≥3.14，Node ^26.4，Go 1.26（backend stub）。

## 4) Documentation Index

项目规则（`docs/rules/`）：

- [architecture.md](docs/rules/architecture.md) — 后端分层、数据层、API 约定、双端分流
- [code-style.md](docs/rules/code-style.md) — 后端/ Vue/ React 代码风格
- [commands.md](docs/rules/commands.md) — 常用命令速查
- [design-system.md](docs/rules/design-system.md) — 3 层 token 架构、组件规则、禁止事项
- [domain.md](docs/rules/domain.md) — 领域词汇表
- [environment.md](docs/rules/environment.md) — 环境变量、端口、工具链版本
- [logging.md](docs/rules/logging.md) — 日志编排规约 (structlog + Taskiq 落库)
- [testing.md](docs/rules/testing.md) — 前端测试规范 (Vue + React + Vitest 4)

设计系统：

- [DESIGN.md](DESIGN.md) — 完整设计系统参考（色彩/排版/主题/组件，由 `.impeccable/` 生成）

## Agent skills

### Design Context

See [PRODUCT.md](PRODUCT.md) for register, audience, brand personality (书卷气 · 准 · 适), anti-references, and design principles. The 3-layer token contract and 禁止事项 list live in [design-system.md](docs/rules/design-system.md); the canonical color/typography/visual system is being captured separately as DESIGN.md (run `/impeccable document` to generate it from existing tokens).

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
