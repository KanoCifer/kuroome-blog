# CLAUDE.md

## 1) Rules (Highest Priority)

- 用户使用中文提问时，使用中文回复。
- 编辑已有文件时，使用增量修改，不做无关重写。
- 修改前端代码后，必须运行：`pnpm run type-check`。
- **不要自动运行 `pnpm run build`**，除非用户明确要求。
- 提交前执行对应语言的格式化与 lint。

## 2) Project Overview

- Stack: FastAPI + Vue3 (desktop) + React19 (mobile, `react-app/`) + TS
- **双前端架构**: Vue (`frontend/`) + React (`react-app/`) 共享后端服务，但各自维护独立状态 Store；API 契约修改需同步两端

## 3) Documentation Index

详细指令按主题拆分到 `.claude/rules/`：

- [commands.md](.claude/rules/commands.md) — 所有构建/测试/格式化命令
- [code-style.md](.claude/rules/code-style.md) — 代码风格规范
- [architecture.md](.claude/rules/architecture.md) — 架构分层、目录结构、API 契约变更
- [environment.md](.claude/rules/environment.md) — 环境变量、关键文件
