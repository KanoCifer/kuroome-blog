# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🤖 代理专属规则
> 重要：以下规则仅对开发代理有效
- 用户用中文提问时，请用中文回答
- 编辑已存在的文件时，优先使用 edit 工具，不要使用 write 工具
- 编辑前端代码后运行 `pnpm type-check`，**禁止自动运行 `pnpm build`**，除非用户明确要求
- 提交代码前必须执行对应语言的格式化和检查命令

---

## 项目概述
基于 FastAPI + Vue 3 的全栈阅读清单管理与个人博客系统，包含用户认证、书籍管理、微信读书导入、博客系统、留言板、RSS 阅读器、AI 助手、后台监控等功能。

## 常用命令

### 后端 (在 `backend/` 目录下执行)
```bash
# 开发
python dev.py                           # 启动开发服务器 (:5555)
ruff format . && ruff check .           # 格式化 + 代码检查
ruff check . --fix                      # 自动修复 lint 问题
alembic revision --autogenerate -m "描述" # 生成数据库迁移
alembic upgrade head                    # 执行所有迁移

# 测试
python -m pytest                        # 运行所有后端测试
python -m pytest tests/test_x.py -v     # 运行单个测试文件
python -m pytest tests/test_x.py::test_func -v  # 运行单个测试函数
python -m pytest -k "关键字"            # 按关键字过滤测试
```

### 前端 (在 `frontend/` 目录下执行)
```bash
# 开发
pnpm run dev                            # 启动开发服务器 (:5173)
pnpm run format                         # Prettier 格式化代码
pnpm run lint                           # 运行 Oxlint + ESLint 检查
pnpm run type-check                     # 运行 TypeScript 类型检查
pnpm run build                          # 完整构建 (类型检查 + 编译)
pnpm run build-only                     # 仅构建 (跳过类型检查)

# 测试
pnpm run test:unit                      # 运行 Vitest 单元测试
npx playwright test                     # 运行 Playwright E2E 测试
npx playwright test --headed            # 可视化模式运行 E2E 测试
npx playwright test --debug             # 调试 E2E 测试
```

## 架构概览
```
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/              # API 端点 (auth, books, blog, messages, weread, rss, admin, aiagent, todos 等)
│   │   ├── models/              # 数据库模型 (SQLAlchemy 2.0 + MongoDB Beanie)
│   │   ├── schemas/             # Pydantic 请求/响应 schema (按领域拆分的独立模块)
│   │   ├── repositories/        # 数据访问层
│   │   ├── services/            # 业务逻辑层
│   │   ├── core/                # 核心配置、日志、AI Agent
│   │   ├── utils/               # 工具函数
│   │   ├── tasks/               # Taskiq 异步任务
│   │   └── main.py              # FastAPI 应用入口
│   ├── alembic/                 # 数据库迁移
│   └── ruff.toml                # Ruff 配置
├── frontend/                    # Vue 3 + TypeScript 前端
│   └── src/
│       ├── views/               # 页面组件
│       ├── components/          # 可复用 Vue 组件
│       ├── stores/              # Pinia 状态管理
│       ├── router/              # Vue Router 配置
│       ├── types/               # TypeScript 类型定义
│       ├── lib/                 # 第三方库封装
│       ├── utils/               # 工具函数
│       └── layouts/             # 布局组件
├── tests/                       # Pytest 后端测试 + Playwright E2E 测试
└── scripts/                     # 工具脚本
```

## 技术栈
- **后端**: FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, MongoDB (Beanie), Redis, Taskiq
- **前端**: Vue 3.5, TypeScript, Vite, Tailwind CSS v4, Pinia, shadcn-vue
- **AI**: Agno (替代 Langchain)
- **端口**: 后端 `:5555`，前端 `:5173`

## 代码规范

### 后端 (Python)
- Ruff 配置 (`ruff.toml`)：行宽 79 字符，4 空格缩进，双引号，Python 3.14 目标
- 类型注解：使用 Python 3.14+ 现代语法 (`list[str]` 而非 `List[str]`)
- 命名：函数/变量用 `snake_case`，类用 `PascalCase`，常量用 `UPPER_SNAKE_CASE`
- 禁止空 `except:` 块，必须指定异常类型
- 所有公共函数/类需要 Google 风格 docstring
- 数据库操作使用 async 驱动 + `async/await`
- import 排序：标准库 → 第三方 → 本地 (isort)
- 禁止相对导入，使用 `from app.xxx import ...` 绝对路径
- Schema 按领域拆分到 `app/schemas/` 下独立文件 (auth, book, blog, rss 等)

### 前端 (Vue/TypeScript)
- 使用 `<script setup lang="ts">` + Composition API (禁止使用 Options API)
- 严格 TypeScript：避免 `any`，使用 `unknown` + 类型守卫
- 命名：函数/变量用 `camelCase`，组件/类型用 `PascalCase`
- 组件文件用 `PascalCase.vue`，工具文件用 `camelCase.ts`
- 优先使用 Tailwind CSS 工具类，避免自定义 CSS
- 路径使用 `@/` 别名指向 `frontend/src/` 目录
- 包管理器使用 `pnpm`，不要使用 `npm`

### 数据库
- SQLAlchemy 模型：`backend/app/models/models.py`
- MongoDB Beanie 模型：`backend/app/models/beanie.py`
- Pydantic Schema：`backend/app/schemas/` (按领域拆分的独立模块)
- 迁移文件：`backend/alembic/versions/`

## 提交规范
1. 后端提交前：`cd backend && ruff format . && ruff check .`
2. 前端提交前：`cd frontend && pnpm format && pnpm lint && pnpm type-check`
3. 提交信息遵循 Conventional Commits 格式：`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`
4. 分支命名：`feature/xxx`, `fix/xxx`, `refactor/xxx`
5. 禁止提交：`.env`, `node_modules/`, `.venv/`, `__pycache__/`, 临时文件
