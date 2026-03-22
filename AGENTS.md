# AGENTS.md — 开发指南

> 用户用中文提问时，请用中文回答
> 编辑的文件存在时，请直接使用 edit 工具编辑，不要使用 write 工具
> 编辑前端代码后运行 `pnpm type-check`，不要运行 `pnpm build`

## 项目架构

- **前端**: Vue 3.5 + TypeScript + Vite + Tailwind CSS v4 + Pinia + shadcn-vue
- **后端**: FastAPI + SQLAlchemy 2.0 + Python 3.14+ + PostgreSQL + MongoDB (Beanie) + Redis
- **AI**: Agno

## 目录结构

```
backend/
├── app/
│   ├── routers/       # API: auth, books, blog, users, messages, weread, public, monitor, rss, admin, aiagent
│   ├── models/        # SQLAlchemy 2.0 (models.py) + MongoDB (mgmodel.py)
│   ├── schemas/       # Pydantic schemas
│   ├── dependencies/  # FastAPI 依赖注入 (database, redis, auth)
│   ├── middleware/     # 中间件
│   ├── configs/       # 配置 (settings, logger)
│   ├── utils/         # 工具函数
│   └── tasks/         # Taskiq 异步任务
├── alembic/           # 数据库迁移
├── dev.py             # 开发入口 (:5555)
└── ruff.toml          # Ruff 配置

frontend/src/
├── components/        # Vue 组件
├── views/             # 页面 (auth, books, blog, rss, general)
├── stores/            # Pinia 状态管理
├── router/            # Vue Router
├── types/             # TypeScript 类型定义
├── lib/               # 库封装
├── utils/             # 工具函数
├── layouts/           # 布局组件
└── assets/            # 静态资源

tests/                 # Pytest (后端) + Playwright (E2E)
scripts/               # 工具脚本
```

## 命令

### 后端

```bash
cd backend
ruff format . && ruff check .           # 格式化 + 检查
ruff check . --fix                      # 自动修复
alembic revision --autogenerate -m "x"  # 生成迁移
alembic upgrade head                    # 执行迁移
python dev.py                           # 启动 (:5555)

# 测试
python -m pytest                        # 运行所有测试
python -m pytest tests/test_x.py -v     # 运行单个测试文件
python -m pytest tests/test_x.py::test_func -v  # 运行单个测试函数
python -m pytest -k "keyword"           # 按关键字过滤测试
```

### 前端

```bash
cd frontend
pnpm run dev                            # 启动 (:5173)
pnpm run build                          # 构建 (先 type-check 再 build)
pnpm run build-only                     # 仅构建 (跳过 type-check)
pnpm run format                         # Prettier 格式化
pnpm run lint                           # Oxlint + ESLint 检查
pnpm run type-check                     # Vue-tsc 类型检查

# 测试
pnpm run test:unit                      # Vitest 单元测试
npx playwright test                     # E2E 测试
npx playwright test --headed            # 可视化模式
npx playwright test --debug             # 调试模式
```

## 代码风格

### 后端 (Python)

- **Ruff 配置**: 见 `backend/ruff.toml`
  - 行宽: 79 字符
  - 缩进: 4 空格
  - 引号: 双引号
  - 目标版本: Python 3.14
- **导入顺序**: `from __future__ import annotations` → stdlib → third-party → first-party → local
- **类型注解**: Python 3.14+ 语法 (`list[str]` 而非 `List[str]`, `dict[str, int]` 而非 `Dict`)
- **命名**:
  - 函数/变量: `snake_case`
  - 常量: `UPPER_SNAKE_CASE`
  - 类: `PascalCase`
  - 私有: `_leading_underscore`
- **禁止**:
  - `as any`, `@ts-ignore` (Python 中不适用)
  - 空 `except:` 块 — 必须指定异常类型
  - 裸 `except:` — 使用 `except Exception as e:`
- **文档字符串**: Google 风格，所有公共函数/类必须有 docstring
- **异步**: 使用 `async/await`，数据库操作使用 async 驱动
- **错误处理**: 使用自定义异常类 (`app/exceptions.py`)，通过全局异常处理器统一处理
- **环境变量**: 使用 `python-dotenv`，从 `.env` 文件加载，通过 `os.environ["KEY"]` 访问

### 前端 (Vue/TS)

- **格式化**: Prettier + Tailwind CSS 插件自动排序类名
- **Linting**: Oxlint (主要) + ESLint (补全)
  - 插件: `eslint-plugin-vue`, `@vue/eslint-config-typescript`, `@vitest/eslint-plugin`
- **TypeScript**: 严格模式，避免 `any`，使用 `unknown` + 类型守卫
- **Vue 组件**:
  - 使用 `<script setup lang="ts">`
  - Composition API (不要 Options API)
  - Props 使用 `defineProps<{...}>()` 类型声明
  - Emits 使用 `defineEmits<{...}>()` 类型声明
- **命名**:
  - 函数/变量: `camelCase`
  - 组件/类型: `PascalCase`
  - 常量: `UPPER_SNAKE_CASE`
  - 文件: 组件用 `PascalCase.vue`，工具用 `camelCase.ts`
- **样式**: Tailwind CSS utility classes，避免自定义 CSS
- **异步**: 使用 `async/await`，避免 `.then()` 链
- **状态管理**: Pinia stores (`frontend/src/stores/`)
- **路由**: `@/` 别名指向 `src/` 目录

### 数据库模型

- **SQLAlchemy**: 模型定义在 `backend/app/models/models.py`
- **MongoDB (Beanie)**: 文档模型在 `backend/app/models/mgmodel.py`
- **Pydantic**: 请求/响应 schema 在 `backend/app/schemas/`
- **迁移**: Alembic 生成在 `backend/alembic/versions/`

### API 路由

- 所有路由在 `backend/app/routers/` 目录
- 使用 `APIRouter` 前缀 `/api/v1`
- 依赖注入通过 `backend/app/dependencies/`
- 限流使用 `slowapi`

## 关键位置

| 任务       | 路径                                   |
| ---------- | -------------------------------------- |
| API 路由   | `backend/app/routers/`                 |
| SQLAlchemy | `backend/app/models/models.py`         |
| MongoDB    | `backend/app/models/mgmodel.py`        |
| Pydantic   | `backend/app/schemas/`                 |
| Vue 组件   | `frontend/src/components/`             |
| 页面       | `frontend/src/views/`                  |
| Pinia      | `frontend/src/stores/`                 |
| 路由       | `frontend/src/router/`                 |
| 类型       | `frontend/src/types/`                  |
| 认证       | `backend/app/routers/auth.py`          |
| 数据库迁移 | `backend/alembic/versions/`            |
| 异常处理   | `backend/app/exceptions.py`            |
| 配置       | `backend/app/configs/`                 |

## 提交规则

1. 后端编辑后: `cd backend && ruff format . && ruff check .`
2. 前端编辑后: `cd frontend && pnpm run format && pnpm run lint && pnpm run type-check`
3. 不提交: `.env`, `node_modules/`, `.venv/`, `__pycache__/`, 临时文件
4. 提交信息遵循 Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`
5. 分支命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`

## 注意事项

- 前端使用 **pnpm** 作为包管理器 (不是 npm)
- 后端使用 **Python 3.14+**，支持最新类型语法
- 数据库使用 **PostgreSQL** (主库) + **MongoDB** (文档存储) + **Redis** (缓存)
- 开发端口: 后端 `:5555`，前端 `:5173`
- 前端通过 Vite proxy 代理 API 请求到后端
