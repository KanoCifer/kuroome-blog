# ReadingList

[![Python](https://img.shields.io/badge/Python-v3.14%2B-3776AB?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-NEW-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vue](https://img.shields.io/badge/Vue-v3.5-42b883?logo=vue.js)](https://vuejs.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-v2.0-D71F00)](https://www.sqlalchemy.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2024-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![Alembic](https://img.shields.io/badge/Alembic-revisions-4B5563?logo=alembic)](https://alembic.sqlalchemy.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18+-336791?logo=postgresql)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0-d82c20?logo=redis)](https://redis.io/)
[![Pinia](https://img.shields.io/badge/Pinia-2.0-7b3fe4?logo=pinia)](https://pinia.vuejs.org/)

基于 **FastAPI + Vue 3** 的全栈阅读清单管理/个人博客项目。项目包含用户认证、用户注册、书籍管理、书架展示、博客系统、微信读书导入、数据库迁移，后台监控、Rss解析/阅读器。

## 项目概述

- **架构**: 完整的 SPA 应用（Vue 3 前端 + FastAPI/APIFlask 后端）
- **后端**:
  - **FastAPI** 提供 `/api/v1` 端点
  - SQLAlchemy 2.0、Python 3.14+、PostgreSQL (生产)
  - MongoDB (用于留言板和博客，使用 Beanie异步ODM驱动)
  - JWT / Cookie-based 认证、邮件发送等常见后端功能
  - Redis 用于缓存和会话管理
- **前端**: Vue 3.5、TypeScript、Vite、Tailwind CSS v4、Pinia、Vue Router
- **项目地址**: [Kuroome's Blog](https://kanocifer.chat)

## 技术栈

### 后端

- **FastAPI**: 现代高性能异步 API 框架（主线）
- **SQLAlchemy 2.0**: 类型安全的 ORM
- **Alembic**: 数据库迁移（推荐使用 alembic upgrade head）
- **MongoDB**: 留言板/博客文章（使用 Beanie 或 Motor 集成）
- 认证：JWT / Cookie（FastAPI Login实现）
- 邮件发送：使用 FastAPI 邮件库（FastAPI-Mail）

### 前端

- **Vue 3.5**: 渐进式 JavaScript 框架
- **TypeScript**: 类型安全
- **Vite**: 下一代前端构建工具
- **Tailwind CSS v4**: 实用优先的 CSS 框架
- **Pinia**: Vue 状态管理
- **Vue Router**: Vue 路由

### 数据库

- **PostgreSQL**: 生产环境高性能关系型数据库
- **MongoDB**: 存储留言板和博客文章
- **Alembic**: 数据库迁移工具
- **Beanie**: MongoDB 异步驱动与 ODM
- **Redis**: 缓存层

## 快速开始

```bash
# 1. Python 环境
cd backend
python -m venv .venv
source .venv/bin/activate

# 2. 前端依赖
cd ../frontend
npm i

# 3. 配置环境变量
backend/.env
# 编辑 backend/.env 配置数据库等信息

# 4. 数据库初始化
cd backend
# 使用 Alembic 执行迁移到最新版本
alembic upgrade head

# 5. 启动开发服务器
# FastAPI 后端 (:5555)
cd backend && python dev.py
# 前端 (:5173)
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

# 数据库（Alembic）
alembic revision --autogenerate -m "description" # 生成迁移
alembic upgrade head # 迁移到最新版本
alembic downgrade -1 # 回滚上一个迁移

# 开发服务器
python dev.py           # FastAPI on :5555 (主服务)
```

### 前端

```bash
cd frontend

# 安装依赖
npm i

# 开发服务器
npm run dev             # Vite + Tailwind watch on :5173

# 构建
npm run build           # 生产构建

# 格式化与检查
npm run lint            # ESLint + Oxlint
npm run format          # Prettier
npm run format:check    # 仅检查格式
```

## 项目结构

```
├── backend/
│   ├── app/                # FastAPI 应用 (NEW :5555)
│   │   ├── routers/       # API: auth, blog, books, messages, public, users, weread
│   │   ├── models/        # SQLAlchemy 2.0 模型
│   │   ├── schemas/       # Pydantic schemas
│   │   └── dependencies/ # FastAPI 依赖注入
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
├── .env.example           # 环境变量示例
├── AGENTS.md              # 开发指南
└── README.md              # 项目说明
```

## API 端点

### FastAPI (主服务 — :5555)

| 路由               | 描述             |
| ------------------ | ---------------- |
| `/api/v1/auth`     | 认证             |
| `/api/v1/books`    | 书籍管理         |
| `/api/v1/users`    | 用户管理         |
| `/api/v1/blog`     | 博客系统         |
| `/api/v1/messages` | 留言板           |
| `/api/v1/weread`   | 微信读书导入     |
| `/api/v1/public`   | 公共数据         |
| `/api/v1/monitor`  | 后台监控数据     |
| `/api/v1/rss`      | Rss 解析与阅读器 |
| `/api/v1/admin`    | 管理员功能       |

## 配置

关键配置项：

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///data.db

# 或使用 PostgreSQL:
# DATABASE_URL=postgresql+psycopg2://user:password@localhost/readinglist
MONGO_URI=mongodb://localhost:27017/readinglist
```

## 代码风格（Code style）

本项目使用 Ruff（Python）与 Prettier/ESLint（前端）来保证一致的代码风格。提交前请运行相应格式化工具。

## License

MIT
