# CLAUDE.md

## 1) Rules (Highest Priority)

- **代码质量检查已自动化**：per-edit 触发 prettier / oxlint / ruff format / ruff check / gofmt / go vet（见 `.claude/settings.json` 的 PostToolUse hook），commit 时跑 `pnpm type-check` / `ruff check` / `go vet` / `go build`（见 `.git/hooks/pre-commit`）。Claude 不必主动运行这些命令。
- 样式必须使用语义化 Tailwind class，禁止硬编码颜色。
- 用户没有特殊要求，禁止执行 `pnpm build`
- 后端使用 `uv` 管理依赖。

## 2) Project Overview

- kanocifer.chat 个人网站（"kuro neko" / 黑猫）。技术栈、数据层、分层、API 约定见 [architecture.md](docs/rules/architecture.md)。
- **双前端架构**：Vue (`frontend/`) + React (`react-app/`) 共享后端、各自独立状态 Store。
  - API 契约 / `backend/app/schemas/` 变更 → 必须同步 `frontend/src/api/` 与 `react-app/src/services/`。
- **缓存**：`app/plugins/cache/` 的 `@redis_cache(ttl=N, exclude=[...])`；`exclude` 跳过 Depends 参数（不参与 cache key）。
- **`composables/` 按域分目录**（`shared/ card/ article/ pic/ rss/ weread/ comment/ todo/`）含 `index.ts` 桶导出；跨域 import 走桶，不直接指向文件。详见 [code-style.md](docs/rules/code-style.md)。

## Go Backend (go-backend/)

`go-backend/` 是 Python `backend/` 的 Go 重构（核心功能已实现，持续完善中）。详见 [go-backend.md](docs/rules/go-backend.md) 查分层、鉴权差异、测试与已知遗留。要点：

- **运行**:`cd go-backend && go run ./cmd/server` → `127.0.0.1:5555`，路由前缀 `/api/v3/*`
- **命名对齐**:复用 Python 后端的 `.env`（`DATABASE_URL / SECRET_KEY / REDIS_URL / MONGO_URI / PORT` 等）
- **日志**: `internal/logger/` 基于 `log/slog`，双文件路由 + trace_id + lumberjack 轮转
- **关键差异**:admin 走 `middleware.AdminMiddleware()` + `ADMIN_USER_IDS`（非 `is_admin` 字段）；`email_code` 真校验 Redis `signup_code:{email}`；非法 admin post id 返回 400

## 3) Environment & Gotchas

环境变量与端口见 [environment.md](docs/rules/environment.md)；命令见 [commands.md](docs/rules/commands.md)。要点：

- **Beanie 模型注册**：新增 MongoDB 文档模型必须加入 `main.py` 的 `init_beanie()` 的 `document_models` 列表，否则不会创建集合。
- **Ruff**：`ban-relative-imports = "all"`（禁止相对导入，只用绝对导入）；`line-length = 79`；允许中文字符。
- **端口**：后端 `127.0.0.1:5555`，前端通过 Vite proxy 转发 `/api/`（Vue `:5173` / React `:5174`）。
- **工具链**：Python ≥3.14，Node ^26.4，Go 1.26。
- **前端 lint/format**：两个前端均用 `oxlint` 做 lint、`prettier-plugin-tailwindcss` 排序 Tailwind class（非 eslint）。

## 4) Documentation Index

项目规则（`docs/rules/`）：

- [architecture.md](docs/rules/architecture.md) — 后端分层、数据层、API 约定、双端分流
- [code-style.md](docs/rules/code-style.md) — 后端/ Vue/ React 代码风格
- [commands.md](docs/rules/commands.md) — 常用命令速查
- [design-system.md](docs/rules/design-system.md) — 3 层 token 架构、组件规则、禁止事项
- [domain.md](docs/rules/domain.md) — 领域词汇表
- [environment.md](docs/rules/environment.md) — 环境变量、端口、工具链版本
- [go-backend.md](docs/rules/go-backend.md) — Go 重构的分层、鉴权差异、测试、已知遗留
- [auth.md](docs/rules/auth.md) — **双后端认证统一契约**(JWT/Refresh/Password/Admin,两端必读)
- [logging.md](docs/rules/logging.md) — 日志编排规约 (structlog + Taskiq 落库)
- [testing.md](docs/rules/testing.md) — 前端测试规范 (Vue + React + Vitest 4)

设计系统：

- [DESIGN.md](DESIGN.md) — 完整设计系统参考（色彩/排版/主题/组件，由 `.impeccable/` 生成）

## Agent skills

### Design Context

See [PRODUCT.md](PRODUCT.md) for register, audience, brand personality (书卷气 · 准 · 适), anti-references, and design principles. The 3-layer token contract and 禁止事项 list live in [design-system.md](docs/rules/design-system.md); the canonical color/typography/visual system is being captured separately as DESIGN.md (run `/impeccable document` to generate it from existing tokens).

### Issue tracker

GitHub — issues live in the repo's GitHub Issues (`gh` CLI); PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
