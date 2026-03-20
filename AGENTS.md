# AGENTS.md — 开发指南

> 用户用中文提问时，请用中文回答
> 编辑的文件存在时，请直接使用edit工具编辑，不要使用write工具
> 任务完成后不要运行build工具

## 项目架构

- **前端**: Vue 3.5 + TypeScript + Vite + Tailwind CSS v4 + Pinia
- **后端**: FastAPI + SQLAlchemy 2.0 + Python 3.14+ + PostgreSQL + MongoDB (Beanie) + Redis

## 目录结构

```
backend/
├── app/routers/       # API: auth, books, blog, users, messages, weread, public, monitor, rss, admin, aiagent
├── app/models/        # SQLAlchemy 2.0
├── app/schemas/       # Pydantic
├── migrations/        # Alembic
dev.py                 # 入口 (:5555)

frontend/src/
├── components/        # Vue 组件
├── views/             # 页面
├── stores/            # Pinia
├── router/            # Vue Router
App.vue                # 入口 (:5173)
```

## 命令

### 后端

```bash
cd backend
ruff format . && ruff check .          # 格式化 + 检查
ruff check . --fix                     # 自动修复
alembic revision --autogenerate -m "x"  # 生成迁移
alembic upgrade head                    # 执行迁移
python dev.py                           # 启动 (:5555)
```

### 前端

```bash
cd frontend
npm run dev                             # 启动 (:5173)
npm run build                           # 构建
npm run format                          # Prettier 格式化
npm run lint                            # ESLint + Oxlint 检查
```

## 代码风格

### 后端 (Python)

- **Ruff**: 79字符行宽, 4空格, 双引号
- **导入顺序**: future → stdlib → third-party → first-party → local
- **类型注解**: Python 3.14+ 语法 (`list[str]` 而非 `List[str]`)
- **命名**: 函数/变量 snake_case, 常量 UPPER_SNAKE_CASE, 类 PascalCase
- **禁止**: `as any`, `@ts-ignore`, 空 catch 块, 裸 `except:`
- **文档字符串**: Google 或 NumPy 风格

### 前端 (Vue/TS)

- **Prettier**: 4空格, Tailwind CSS 插件
- **TypeScript**: 严格模式 (`strict: true`)
- **Vue**: `<script setup lang="ts">`, Composition API
- **命名**: 函数/变量 camelCase, 组件/类型 PascalCase, 常量 UPPER_SNAKE_CASE
- **样式**: Tailwind CSS utility classes, 避免自定义 CSS
- **异步**: 使用 `async/await`, 避免 `.then()` 链

## 关键位置

| 任务     | 路径                                  |
| -------- | ------------------------------------- |
| API      | `backend/app/routers/`                |
| 模型     | `backend/app/models/`                 |
| 模式     | `backend/app/schemas/`                |
| Vue组件  | `frontend/src/components/`            |
| 页面     | `frontend/src/views/`                 |
| 状态管理 | `frontend/src/stores/`                |
| 路由     | `frontend/src/router/`                |
| 认证     | `backend/app/routers/auth.py`         |
| 数据库   | `backend/app/models/` + `migrations/` |

## 提交规则

1. 后端编辑后: `ruff format . && ruff check .`
2. 前端编辑后: `pnpm run format && pnpm run lint`
3. 不提交 `.env`, `node_modules/`, `.venv/`, 临时文件
4. 提交信息遵循 Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`
5. 分支命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`
