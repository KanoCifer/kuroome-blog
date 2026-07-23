# CLAUDE.md

## 1) Rules (Highest Priority)

- 使用语义化 Tailwind class，禁止硬编码颜色。
- 用户没有特殊要求，禁止执行 `pnpm build`
- 后端使用 `uv` 管理依赖。

## 2) Project Overview

- kanocifer.chat 个人网站（"kuro neko" / 黑猫）。
- **双前端架构**：Vue (`frontend/`) + React (`react-app/`) 共享后端、各自独立状态 Store。

## 3) Documentation Index

项目规则（`docs/rules/`）：

- [architecture.md](docs/rules/architecture.md) — 后端分层、数据层、API 约定、双端分流
- [code-style.md](docs/rules/code-style.md) — 后端/ Vue/ React 代码风格
- [commands.md](docs/rules/commands.md) — 常用命令速查
- [domain.md](docs/rules/domain.md) — 领域词汇表
- [environment.md](docs/rules/environment.md) — 环境变量、端口、工具链版本
- [go-backend.md](docs/rules/go-backend.md) — Go 重构的分层、鉴权差异、测试、已知遗留
- [auth.md](docs/rules/auth.md) — **双后端认证统一契约**(JWT/Refresh/Password/Admin)
- [logging.md](docs/rules/logging.md) — 日志编排规约 (structlog + Taskiq 落库)
- [testing.md](docs/rules/testing.md) — 前端测试规范 (Vue + React + Vitest 4)
