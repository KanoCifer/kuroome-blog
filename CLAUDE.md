# CLAUDE.md

## 1) Rules (Highest Priority)

- 修改前端代码后，必须运行类型检查：
  - Vue: `cd frontend && pnpm run type-check`
  - React: `cd react-app && pnpm run type-check`
- **提交前必跑**：(1) 改前端 → `pnpm run type-check` (2) 改后端 → `ruff check .` (3) 各自语言的 lint + format
- 样式必须使用语义化 Tailwind class（`bg-background`, `text-foreground` 等），禁止硬编码颜色（`bg-black/75`, `text-white/90`）。
- 用户没有特殊要求，静止执行`pnpm build`
- 后端使用 `uv` 管理依赖。

## 2) Project Overview

- kanocifer.chat 个人阅读追踪 + 博客系统。名称源于日语 "kuro neko"（黑猫）
- Backend: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie (MongoDB) + Redis
- Desktop: Vue 3 (`frontend/`), Mobile: React 19 (`react-app/`)
- **双前端架构**: Vue + React 共享后端服务，各自维护独立状态 Store；API 契约修改需同步两端
- 修改 `backend/app/schemas/` 后，必须同步 `frontend/src/api/` 和 `react-app/src/services/`。
- 缓存模块在 `app/plugins/cache/`。端点用 `@redis_cache(ttl=N, exclude=[...])`，`exclude` 跳过 Depends 参数（不参与 cache key）
- **`composables/` 按域分目录**（`shared/ card/ article/ rss/ weread/ comment/ todo/`），与 `views/` `components/` 分域策略一致；每个子目录用 `index.ts` 桶导出，跨域 import 走桶 `from '@/composables/<domain>'`，不要直接指向具体文件

## 3) Documentation Index

按需查阅`docs/rules/`：

- [code-style.md](docs/rules/code-style.md) — 代码风格规范
- [design-system.md](docs/rules/design-system.md) — 语义化 token、组件样式规则、禁止事项
- [domain.md](docs/rules/domain.md) — 领域词汇表
- [environment.md](docs/rules/environment.md) — 环境变量、关键文件
- [logging.md](docs/rules/logging.md) — 日志编排规约 structlog

## Agent skills

### Design Context

See [PRODUCT.md](PRODUCT.md) for register, audience, brand personality (书卷气 · 准 · 适), anti-references, and design principles. The 3-layer token contract and 禁止事项 list live in [design-system.md](docs/rules/design-system.md); the canonical color/typography/visual system is being captured separately as DESIGN.md (run `/impeccable document` to generate it from existing tokens).

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
