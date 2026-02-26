# ReadingList

[![Python](https://img.shields.io/badge/Python-v3.14%2B-3776AB?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-NEW-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Flask](https://img.shields.io/badge/Flask-LEGACY-000000?logo=flask)](https://flask.palletsprojects.com/)
[![Vue](https://img.shields.io/badge/Vue-v3.5-42b883?logo=vue.js)](https://vuejs.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-v2.0+-D71F00)](https://www.sqlalchemy.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2024-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?logo=playwright)](https://playwright.dev/)

基于 **FastAPI + Flask + Vue 3 + SQLAlchemy 2.0** 的全栈阅读清单管理项目，包含用户认证、书籍管理、博客系统、微信读书导入、数据迁移与 Playwright E2E 测试。

## 项目概述

- **架构**: 完整的 SPA 应用（Vue 3 前端 + FastAPI/Flask API 后端）
- **后端**:
  - **FastAPI** (新版): 运行在 `:5555`，提供 `/api/v1` 端点
  - **Flask** (遗留): 运行在 `:5050`，提供 `/api` 端点
  - SQLAlchemy 2.0、Python 3.14+、SQLite3 (开发)、PostgreSQL (生产)
  - Flask-PyMongo (MongoDB 用于留言板和博客)
- **前端**: Vue 3.5、TypeScript、Vite、Tailwind CSS v4、Pinia、Vue Router
- **测试**: Pytest (后端)、Vitest (前端)、Playwright (E2E)

## 技术栈

### 后端

- **FastAPI** (新版): 现代高性能 API 框架
- **Flask** (遗留): 传统 Flask 应用
- **SQLAlchemy 2.0**: 类型安全的 ORM
- **Alembic**: 数据库迁移
- **Flask-Login**: 用户认证
- **Flask-PyMongo**: MongoDB 集成（留言板、博客文章）
- **Flask-Mail**: 邮件发送

### 前端

- **Vue 3.5**: 渐进式 JavaScript 框架
- **TypeScript**: 类型安全
- **Vite**: 下一代前端构建工具
- **Tailwind CSS v4**: 实用优先的 CSS 框架
- **Pinia**: Vue 状态管理
- **Vue Router**: Vue 路由

### 数据库

- **SQLite**: 开发环境轻量级数据库
- **PostgreSQL**: 生产环境高性能关系型数据库
- **MongoDB**: 存储留言板和博客文章

### 测试

- **Pytest**: Python 单元测试
- **Vitest**: Vue 单元测试
- **Playwright**: 端到端测试

## 快速开始

```bash
# 1. Python 环境
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .

# 2. 前端依赖
cd ../frontend
npm install

# 3. 配置环境变量
cd ..
cp .env.example backend/.env
# 编辑 backend/.env 配置数据库等信息

# 4. 数据库初始化
cd backend
flask db upgrade

# 5. 启动开发服务器
# FastAPI 后端 (:5555) - 终端 1
cd backend && python dev.py
# Flask 后端 (:5050) - 终端 2 (可选，遗留)
cd backend && python -m flask --app watchlist run -p 5050
# 前端 (:5173) - 终端 3
cd frontend && npm run dev
```

访问 `http://localhost:5173`

## 常用命令

### 后端

```bash
cd backend

# 格式化与检查
ruff format .
ruff check .
ruff check . --fix

# 运行测试
python -m pytest ../tests/test.py           # 所有测试
python -m pytest ../tests/test.py::test_name   # 单个测试
python -m pytest -k "pattern"               # 模式匹配
python -m pytest -x                         # 首个失败即停止

# 数据库
flask db migrate -m "description"
flask db upgrade
flask db downgrade

# 开发服务器
python dev.py           # FastAPI on :5555 (NEW)
python -m flask --app watchlist run -p 5050  # Flask on :5050 (LEGACY)
```

### 前端

```bash
cd frontend

# 安装依赖
npm install

# 开发服务器
npm run dev             # Vite + Tailwind watch on :5173

# 构建
npm run build           # 生产构建

# 测试
npm run test:unit       # Vitest
npm run test:unit:ui    # Vitest UI

# 格式化与检查
npm run lint            # ESLint + Oxlint
npm run format          # Prettier
npm run format:check    # 仅检查格式
```

### Playwright E2E

```bash
# 需要后端 (:5555) 和前端 (:5173) 同时运行
npx playwright test
npx playwright test tests/example.spec.ts   # 单个文件
npx playwright test --headed                 # 可视化模式
npx playwright test --debug                  # 调试模式
```

## 项目结构

```
├── backend/
│   ├── app/                # FastAPI 应用 (NEW :5555)
│   │   ├── routers/       # API: auth, blog, books, messages, public, users, weread
│   │   ├── models/        # SQLAlchemy 2.0 模型
│   │   ├── schemas/       # Pydantic schemas
│   │   └── dependencies/ # FastAPI 依赖注入
│   ├── watchlist/         # Flask 应用 (LEGACY :5050)
│   │   ├── api/           # RESTful API 路由
│   │   └── models.py      # 遗留 SQLAlchemy 模型
│   ├── migrations/        # Alembic 迁移
│   ├── dev.py             # FastAPI 开发入口 (:5555)
│   ├── pyproject.toml     # Python 依赖 & Ruff 配置
│   └── .env               # 环境变量配置
├── frontend/              # Vue 3 SPA
│   ├── src/
│   │   ├── components/    # Vue 组件
│   │   ├── views/         # 页面组件
│   │   ├── stores/        # Pinia stores
│   │   └── router/        # Vue Router 配置
│   ├── package.json       # Node 依赖
│   └── vite.config.ts     # Vite 配置
├── tests/                 # Pytest & Playwright 测试
│   ├── test.py            # 后端测试
│   └── example.spec.ts    # E2E 测试
├── .env.example           # 环境变量示例
├── AGENTS.md              # 开发指南
└── README.md              # 项目说明
```

## API 端点

### FastAPI (NEW :5555)

| 路由 | 描述 |
|------|------|
| `/api/v1/auth` | 认证（登录、注册） |
| `/api/v1/books` | 书籍管理 |
| `/api/v1/users` | 用户管理 |
| `/api/v1/blog` | 博客系统 |
| `/api/v1/messages` | 留言板 |
| `/api/v1/weread` | 微信读书导入 |

### Flask (LEGACY :5050)

| 路由 | 描述 |
|------|------|
| `/api/auth` | 认证 |
| `/api/books` | 书籍 |
| `/api/blog` | 博客 |

## 配置

复制 `.env.example` 到 `backend/.env` 并配置：

```bash
cp .env.example backend/.env
```

关键配置项：

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///data.db
# 或使用 PostgreSQL:
# DATABASE_URL=postgresql+psycopg2://user:password@localhost/readinglist
MONGO_URI=mongodb://localhost:27017/readinglist
```

## 开发指南

详见 [AGENTS.md](./AGENTS.md) 了解：
- 代码风格规范（Ruff、Prettier）
- SQLAlchemy 2.0 模型写法
- FastAPI API 模式
- Flask API 模式（遗留）
- Flask-PyMongo (MongoDB) 模式
- Vue 3 / TypeScript 规范
- 测试模式与 Fixtures

## License

MIT
