# CLAUDE.md

## 1) Rules (Highest Priority)

- 修改前端代码后，必须运行：`pnpm run type-check`。
- **不要运行 `build`**，除非用户明确要求。
- 提交前执行对应语言的格式化与 lint。

## 2) Project Overview

- **ReadingList**（kanocifer.chat）— 个人阅读追踪 + 博客系统。名称源于日语 "kuro neko"（黑猫）
- Stack: FastAPI + SQLAlchemy 2.0 async (PostgreSQL) + Beanie (MongoDB) + Redis
- Desktop: Vue 3.5 (`frontend/`), Mobile: React 19 (`react-app/`)
- **双前端架构**: Vue + React 共享后端服务，各自维护独立状态 Store；API 契约修改需同步两端

## 3) Documentation Index

详细指令按主题拆分到 `.claude/rules/`：

- [commands.md](.claude/rules/commands.md) — 所有构建/测试/格式化命令
- [code-style.md](.claude/rules/code-style.md) — 代码风格规范
- [architecture.md](.claude/rules/architecture.md) — 架构分层、API 约定、关键约束
- [domain.md](.claude/rules/domain.md) — 领域词汇表
- [environment.md](.claude/rules/environment.md) — 环境变量、关键文件

## Agent skills

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
