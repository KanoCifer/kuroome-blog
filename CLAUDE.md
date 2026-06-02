# CLAUDE.md

## 1) Rules (Highest Priority)

- 修改前端代码后，必须运行类型检查：
  - Vue: `cd frontend && pnpm run type-check`
  - React: `cd react-app && pnpm run type-check`
- 提交前执行对应语言的格式化与 lint，使用 Conventional Commits 格式。
- 编辑器已配置 format-on-save（Prettier frontend/react-app，Ruff backend）— 不要重复格式化。
- 样式必须使用语义化 Tailwind class（`bg-background`, `text-foreground` 等），禁止硬编码颜色（`bg-black/75`, `text-white/90`）。详见 design-system.md。
- 后端使用 `uv` 管理依赖（非 pip），运行命令前先 `cd backend && uv sync`。

## 2) Project Overview

- **ReadingList**（kanocifer.chat）— 个人阅读追踪 + 博客系统。名称源于日语 "kuro neko"（黑猫）
- Stack: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie (MongoDB) + Redis
- Desktop: Vue 3 (`frontend/`), Mobile: React 19 (`react-app/`)
- **双前端架构**: Vue + React 共享后端服务，各自维护独立状态 Store；API 契约修改需同步两端
- 修改 `backend/app/schemas/` 后，必须同步 `frontend/src/api/` 和 `react-app/src/services/`。

## 3) Documentation Index

详细指令按主题拆分到 `.claude/rules/`：

- [commands.md](.claude/rules/commands.md) — 所有构建/测试/格式化命令
- [code-style.md](.claude/rules/code-style.md) — 代码风格规范
- [architecture.md](.claude/rules/architecture.md) — 架构分层、API 约定、关键约束
- [design-system.md](.claude/rules/design-system.md) — 语义化 token、组件样式规则、禁止事项
- [domain.md](.claude/rules/domain.md) — 领域词汇表
- [environment.md](.claude/rules/environment.md) — 环境变量、关键文件

## Agent skills

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
