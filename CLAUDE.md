# CLAUDE.md

## 1) Rules (Highest Priority)

- 修改前端代码后，必须运行类型检查：
  - Vue: `cd frontend && pnpm run type-check`
  - React: `cd react-app && pnpm run type-check`
- **提交前必跑**：(1) 改前端 → `pnpm run type-check` (2) 改后端 → `ruff check .` (3) 各自语言的 lint + format
- 样式必须使用语义化 Tailwind class（`bg-background`, `text-foreground` 等），禁止硬编码颜色（`bg-black/75`, `text-white/90`）。
- 用户没有特殊要求，禁止执行`pnpm build`
- 后端使用 `uv` 管理依赖。
- 前端 lint 用 Oxlint（无 ESLint），自动修复：`pnpm run lint:fix`

## 2) Project Overview

- kanocifer.chat 个人阅读追踪 + 博客系统。名称源于日语 "kuro neko"（黑猫）
- Backend: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie (MongoDB) + Redis
- Desktop: Vue 3 (`frontend/`), Mobile: React 19 (`react-app/`)
- **双前端架构**: Vue + React 共享后端服务，各自维护独立状态 Store；API 契约修改需同步两端
- 修改 `backend/app/schemas/` 后，必须同步 `frontend/src/api/` 和 `react-app/src/services/`。
- 缓存模块在 `app/plugins/cache/`。端点用 `@redis_cache(ttl=N, exclude=[...])`，`exclude` 跳过 Depends 参数（不参与 cache key）
- **`composables/` 按域分目录**（`shared/ card/ article/ pic/ rss/ weread/ comment/ todo/`），与 `views/` `components/` 分域策略一致；每个子目录用 `index.ts` 桶导出，跨域 import 走桶 `from '@/composables/<domain>'`，不要直接指向具体文件

## 3) Conventions

- Commit 风格：Conventional Commits（`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`）
- 分支命名：`feature/xxx`, `fix/xxx`, `refactor/xxx`
- 后端测试：`cd backend && uv run pytest`（测试在 `backend/test/`，非根目录）

## 4) Environment & Gotchas

- **双数据库 URL**：`DATABASE_URL`（asyncpg，应用使用）与 `DB_MIGRATE_URL`（psycopg 同步，Alembic 迁移使用）。迁移时用错 URL 会失败。
- **Beanie 模型注册**：新增 MongoDB 文档模型必须加入 `main.py` 的 `init_beanie()` 的 `document_models` 列表，否则不会创建集合。
- **Ruff**：`ban-relative-imports = "all"`（禁止相对导入，只用绝对导入）；`line-length = 79`；允许中文字符。
- **Prettier**：`prettier-plugin-tailwindcss` 自动排序 Tailwind class。
- **端口**：后端 `127.0.0.1:5555`（非 8000），前端通过 Vite proxy 转发 `/api/`。
- **工具链**：Python ≥3.14，Node ^26.4，Go 1.26（backend stub）。

## 5) Documentation Index

项目规则（`docs/rules/`）：

- [code-style.md](docs/rules/code-style.md) — 代码风格规范
- [design-system.md](docs/rules/design-system.md) — 语义化 token、组件样式规则、禁止事项
- [domain.md](docs/rules/domain.md) — 领域词汇表
- [environment.md](docs/rules/environment.md) — 环境变量、关键文件
- [logging.md](docs/rules/logging.md) — 日志编排规约 structlog

- [architecture.md](docs/rules/architecture.md) — 后端分层、API 约定
- [commands.md](docs/rules/commands.md) — 常用命令速查

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
