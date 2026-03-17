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
![Static Badge](https://img.shields.io/badge/Langchain-v1.0%2B-green%3Flogo%3Dlangchain)

基于 **FastAPI + Vue 3** 的全栈阅读清单管理与个人博客系统。项目包含用户认证、书籍管理、书架展示、博客系统、微信读书导入、RSS 阅读器、AI 文章总结、后台监控等功能。

## 功能特性

### 核心功能

| 功能模块       | 描述                                          |
| -------------- | --------------------------------------------- |
| **用户系统**   | 用户注册、登录、个人资料管理、JWT/Cookie 认证 |
| **书籍管理**   | 书籍添加、编辑、删除、书架展示、阅读进度追踪  |
| **微信读书**   | 从微信读书导入书籍信息                        |
| **博客系统**   | 文章发布、编辑、分类、标签管理                |
| **留言板**     | 访客留言、留言管理                            |
| **RSS 阅读器** | RSS 订阅源解析、文章聚合阅读                  |
| **AI 助手**    | AI 文章总结（基于 Redis 缓存）                |
| **后台监控**   | 系统运行数据监控与分析                        |
| **管理员**     | 用户管理、内容审核、系统配置                  |

### 技术特点

- **后端**: FastAPI 异步框架、SQLAlchemy 2.0 ORM、Alembic 数据库迁移
- **前端**: Vue 3.5 Composition API、TypeScript、Vite、Tailwind CSS v4、Pinia 状态管理
- **数据库**: PostgreSQL (关系型数据) + MongoDB/Beanie (文档数据)
- **缓存**: Redis 会话管理与内容缓存
- **安全**: CSRF 保护、输入验证、错误处理中间件

## 技术栈

### 后端

- **FastAPI**: 现代高性能异步 API 框架（主线）
- **SQLAlchemy 2.0**: 类型安全的 ORM
- **Alembic**: 数据库迁移（推荐使用 alembic upgrade head）
- **Redis**: 缓存层（会话管理、AI 文章总结缓存）
- **APScheduler**: 定时任务调度（如定期清理缓存、发送邮件）
- **Langchain**: AI Agent文章总结
- **Pydantic**: 数据验证与序列化
- **Uvicorn**: ASGI 服务器
- **PostgreSQL**: 生产环境高性能关系型数据库
- **MongoDB**: 留言板/博客文章（使用 Beanie）
- 认证：JWT / Cookie（FastAPI Login实现）
- CSRF 保护：使用 FastAPI 中间件封装
- 邮件发送：使用 FastAPI 邮件库（FastAPI-Mail）

### 前端

- **Vue 3.5**: 渐进式 JavaScript 框架
- **TypeScript**: 类型安全
- **Vite**: 下一代前端构建工具
- **Tailwind CSS v4**: 实用优先的 CSS 框架
- **Pinia**: Vue 状态管理
- **Vue Router**: Vue 路由
- **ESLint + Prettier**: 代码质量与格式化
- **Oxlint**: 前端代码检查
- **Axios**: HTTP 客户端
- **Day.js**: 日期处理
- **VueUse**: Vue 实用工具函数库
- **Shadcn UI**: 基于 Tailwind 的组件库
- **Ant Design Next/Vue**: UI 组件库（部分使用）

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
│   ├── app/
│   │   ├── routers/        # API 路由
│   │   │   ├── auth.py     # 认证 (登录/注册/登出)
│   │   │   ├── books.py    # 书籍管理
│   │   │   ├── users.py    # 用户管理
│   │   │   ├── blog.py     # 博客系统
│   │   │   ├── messages.py # 留言板
│   │   │   ├── weread.py   # 微信读书导入
│   │   │   ├── rss.py      # RSS 阅读器
│   │   │   ├── admin.py    # 管理员
│   │   │   ├── monitor.py  # 后台监控
│   │   │   ├── aiagent.py  # AI 助手
│   │   │   └── public.py   # 公共接口
│   │   ├── models/        # SQLAlchemy 2.0 模型
│   │   ├── schemas/       # Pydantic schemas
│   │   └── dependencies/  # FastAPI 依赖注入
│   ├── migrations/        # Alembic 迁移
│   ├── dev.py             # FastAPI 开发入口 (:5555)
│   ├── pyproject.toml     # Python 依赖 & Ruff 配置
│   └── .env               # 环境变量配置
├── frontend/src/
│   ├── views/             # 页面视图
│   │   ├── auth/          # 认证相关 (登录/注册/个人设置)
│   │   ├── books/         # 书籍与书架
│   │   ├── blog/          # 博客 (列表/文章/编辑)
│   │   ├── rss/           # RSS (订阅/文章/解析)
│   │   └── general/       # 通用 (首页/关于/监控/留言)
│   ├── components/        # Vue 组件
│   ├── stores/            # Pinia 状态管理
│   └── router/            # Vue Router 配置
├── .env.example           # 环境变量示例
├── AGENTS.md              # 开发指南
└── README.md              # 项目说明
```

## API 端点

### FastAPI (主服务 — :5555)

| 路由               | 描述                                  |
| ------------------ | ------------------------------------- |
| `/api/v1/auth`     | 认证 (登录/登出/注册/CSRF/邮箱验证码) |
| `/api/v1/books`    | 书籍管理 (书架 CRUD、阅读进度)        |
| `/api/v1/users`    | 用户资料 (设置、头像上传)             |
| `/api/v1/blog`     | 博客系统 (文章/评论/分类)             |
| `/api/v1/messages` | 留言板 (提交/审核)                    |
| `/api/v1/weread`   | 微信读书导入                          |
| `/api/v1/rss`      | RSS 订阅器 (解析/订阅/文章/已读)      |
| `/api/v1/public`   | 公共接口 (状态/robots/sitemap)        |
| `/api/v1/monitor`  | 后台监控 (访客/登录/服务器状态)       |
| `/api/v1/admin`    | 管理员 (文章管理/审核/埋点)           |
| `/api/v1/agent`    | AI 助手 (文章摘要/流式输出)           |

### 主要端点详情

| 方法 | 路径             | 功能         |
| ---- | ---------------- | ------------ |
| POST | `/auth/login`    | 用户登录     |
| POST | `/auth/register` | 用户注册     |
| GET  | `/auth/me`       | 当前用户信息 |
| GET  | `/book`          | 获取用户书架 |
| POST | `/books/addbook` | 添加书籍     |
| GET  | `/blogs`         | 博客列表     |
| GET  | `/post`          | 文章详情     |
| POST | `/comments`      | 提交评论     |
| GET  | `/messages`      | 留言列表     |
| POST | `/import`        | 微信读书导入 |
| POST | `/rss/parse-rss` | 解析 RSS     |
| POST | `/agent/summary` | AI 文章摘要  |

## 部署

- **在线演示**: [Kuroome's Blog](https://kanocifer.chat)
- **本地端口**: 后端 :5555 / 前端 :5173

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
