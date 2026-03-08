# AGENTS.md — 开发指南

> **Note:** 用户用中文提问时，请用中文回答

## 项目架构

- **前端**: Vue 3.5 + TypeScript + Vite + Tailwind CSS v4 + Pinia
- **后端**: FastAPI (:5555) + SQLAlchemy 2.0 + Python 3.14+ + PostgreSQL + MongoDB (Beanie) + Redis

## 目录结构

```
backend/
├── app/routers/       # API: auth, books, blog, users, messages, weread, public, monitor, rss, admin
├── app/models/        # SQLAlchemy 2.0
├── app/schemas/       # Pydantic
├── migrations/        # Alembic
dev.py                 # 入口 (:5555)

frontend/src/
├── components/        # Vue 组件
├── views/             # 页面
├── stores/            # Pinia
tests/                 # pytest
```

## 命令

### 后端

```bash
cd backend
ruff format . && ruff check .          # 格式化 + 检查
alembic revision --autogenerate -m "x"  # 迁移
alembic upgrade head                    # 执行迁移
python dev.py                           # 启动 (:5555)
```

### 前端

```bash
cd frontend
npm run dev                             # 启动 (:5173)
npm run build                           # 构建
npm run format && npm run lint:oxlint   # 格式化 + 检查
```

## 代码风格

### 后端 (Python)

- **Ruff**: 79字符行宽, 4空格, 双引号
- **导入顺序**: future → stdlib → third-party → first-party → local-folder
- **规则**: E/W/F/I/N/UP/B/C4/DTZ/SIM/TID/PTH/RUF
- **禁止**: `as any`, `@ts-ignore`, 空 catch 块

### 前端 (Vue/TS)

- **Prettier**: 4空格, Tailwind CSS 插件
- **ESLint + Oxlint**
- Vue 3 Composition API (`<script setup>`), TypeScript strict, 组件 PascalCase

## 错误处理

- 后端: Pydantic 验证 + 自定义错误类 + FastAPI 全局异常
- 前端: Vue 错误边界 + Axios interceptors

## 关键位置

| 任务    | 路径                          |
| ------- | ----------------------------- |
| API     | `backend/app/routers/`        |
| 模型    | `backend/app/models/`         |
| Vue组件 | `frontend/src/components/`    |
| 认证    | `backend/app/routers/auth.py` |

## 规则

1. 不修改 `node_modules/`, `.venv/`
2. 后端编辑后: `ruff format . && ruff check .`
3. 前端编辑后: `npm run format && npm run lint:oxlint`
4. 不提交 `.env`, `node_modules/`, `.venv/`
5. 提交前 `lsp_diagnostics`
