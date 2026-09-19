# CLAUDE.md

## 1) Rules (Highest Priority)

- 使用语义化 Tailwind class，禁止硬编码颜色。
- 用户没有特殊要求，禁止执行 `pnpm build`
- Python 后端使用 `uv` 管理依赖。

## 2) Documentation Index

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

架构决策记录（`docs/adr/`）— 6 篇不可逆决策：双前端、数据层、后端分层、日志编排。

## devtask 工作流

### 工作流

需求 → /devtask
→ 落库为 spec + 子任务树
→ /devtask-doit task-N（执行指定任务）
→ /devtask-review（验收条件 + 代码审查）
→ 标已完成

### 引用规范

- spec 是规划节点（kind=spec），subtask 是可执行单元（kind=subtask）
- `parent_slug` 承载结构归属，`blocked_by` 承载同层执行顺序依赖
- 状态推进统一走 `update_task(slug, status=...)` 或 `update_task(slugs=[...])`；其它字段修改走 `update_task(slug, detail=...)`
