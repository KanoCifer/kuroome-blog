# ReadingList

[![Python](https://img.shields.io/badge/Python-v3.14%2B-3776AB?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-NEW-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vue](https://img.shields.io/badge/Vue-v3.5-42b883?logo=vue.js)](https://vuejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react)](https://react.dev/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-v2.0-D71F00)](https://www.sqlalchemy.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2024-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18+-336791?logo=postgresql)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0-d82c20?logo=redis)](https://redis.io/)
[![Pinia](https://img.shields.io/badge/Pinia-2.0-7b3fe4?logo=pinia)](https://pinia.vuejs.org/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-FFB000?logo=zustand)](https://zustand-demo.pmnd.rs/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-FF6600?logo=rabbitmq)](https://www.rabbitmq.com/)

基于 **FastAPI + Vue 3 + React** 的全栈阅读清单管理与个人博客系统，支持**桌面端/移动端自动分流**。

## 功能特性

| 功能模块       | 描述                                  |
| -------------- | ------------------------------------- |
| **用户系统**   | 注册、登录、个人资料、JWT/Cookie 认证、Passkey (WebAuthn)、GitHub OAuth |
| **书籍管理**   | 书籍 CRUD、书架展示、阅读进度追踪     |
| **微信读书**   | 从微信读书导入书籍                    |
| **博客系统**   | 文章发布、分类、标签、评论            |
| **留言板**     | 访客留言、管理                        |
| **RSS 阅读器** | RSS 订阅解析、文章聚合、定时刷新      |
| **AI 助手**    | 文章总结（Redis 缓存）                |
| **待办事项**   | 任务管理、每日提醒（飞书通知）         |
| **后台监控**   | 系统运行数据监控、访客追踪            |
| **图库管理**   | 图片上传、管理                        |

## 技术栈

- **后端**: FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL + MongoDB (Beanie) + Redis + Taskiq (RabbitMQ)
- **桌面端 (Vue)**: Vue 3.5 + TypeScript + Vite + Tailwind CSS v4 + Pinia + shadcn-vue + motion-v
- **移动端 (React)**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + Framer Motion
- **AI**: Agno
- **安全**: JWT 认证、CSRF 保护、WebAuthn/Passkey、GitHub OAuth

## 快速开始

```bash
# 1. 后端环境
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. 配置环境变量
cp .env.example .env  # 编辑 .env 配置数据库等

# 3. 数据库迁移
alembic upgrade head

# 4. 启动开发服务器
python dev.py           # 后端 :5555
cd ../frontend && pnpm install && pnpm run dev  # 桌面端 :5173
cd ../react-app && pnpm install && pnpm run dev # 移动端 :5174
```

- 桌面端: `http://localhost:5173` (Vue)
- 移动端: `http://localhost:5174` (React)

## 常用命令

### 后端

```bash
cd backend
python dev.py                           # 启动 (:5555)
ruff format . && ruff check .           # 格式化 + 检查
ruff check . --fix                      # 自动修复
alembic revision --autogenerate -m "x"  # 生成迁移
alembic upgrade head                    # 执行迁移

# 测试
python -m pytest                                  # 运行所有测试
python -m pytest test/test_main.py -v             # 单个测试文件
python -m pytest test/core/test_config.py::test_config_loading -v # 单个测试函数
python -m pytest -k "config" -v                   # 按关键字过滤
python -m pytest --tb=short                        # 简短 traceback
```

### 前端

```bash
cd frontend
pnpm run dev                            # 启动 (:5173)
pnpm run format                         # Prettier 格式化
pnpm run lint                           # Oxlint + ESLint 检查
pnpm run type-check                     # TypeScript 类型检查
pnpm run build                          # 完整构建 (type-check + compile)
pnpm run build-only                     # 仅构建 (跳过 type-check)

# 测试
pnpm run test:unit                      # Vitest 单元测试
pnpm run test:unit -- src/path/to/file.test.ts # 单个测试文件
pnpm run test:unit -- -t "should render title" # 按测试名过滤
pnpm run test:unit -- src/path/to/file.test.ts -t "should render title" # 文件 + 测试名
pnpm run test:unit -- src/path/to/file.test.ts:42 # 文件 + 行号
npx playwright test                     # E2E 测试
npx playwright test --headed            # 可视化模式
npx playwright test --debug             # 调试模式
```

### 移动端 (React)

```bash
cd react-app
pnpm run dev                            # 启动 (:5174)
pnpm run lint                           # ESLint 检查
pnpm run lint:fix                       # ESLint 自动修复
pnpm run type-check                     # TypeScript 类型检查
pnpm run build                          # 完整构建 (type-check + compile)
pnpm run build-only                     # 仅构建 (跳过 type-check)
```

## 项目结构

```
backend/app/
├── api/
│   ├── des/                  # 数据库连接管理 (Redis, MongoDB)
│   └── v1/                   # API 端点
│       ├── admin.py         # 管理员功能
│       ├── ai.py            # AI 助手
│       ├── auth.py          # 认证 (登录/注册/Passkey/OAuth)
│       ├── blog.py          # 博客系统
│       ├── books.py         # 书籍管理
│       ├── messages.py      # 留言板
│       ├── monitor.py       # 系统监控
│       ├── public.py        # 公共接口
│       ├── publish.py       # 文章发布
│       ├── rss.py           # RSS 订阅器
│       ├── todos.py         # 待办事项
│       └── weread.py        # 微信读书导入
├── core/                     # 核心配置 (config, security, exceptions, AI Agent)
├── models/
│   ├── models.py            # SQLAlchemy 关系模型 (User, Book, Profile, etc.)
│   └── beanie.py            # MongoDB Beanie 文档模型 (Post, MessageBoard, RssArticle)
├── repositories/             # 数据访问层
├── schemas/                  # Pydantic schemas (按领域拆分)
├── services/                 # 业务逻辑层
├── tasks/                    # Taskiq 异步任务
│   ├── aps_tasks.py         # 定时任务 (RSS 刷新、数据迁移)
│   ├── broker.py            # RabbitMQ 任务代理
│   ├── feishu_task.py       # 飞书通知
│   ├── maintain_task.py     # 维护任务
│   ├── scheduler.py         # 任务调度器
│   ├── task.py              # 异步任务 (邮件、缓存)
│   └── weread_task.py       # 微信读书导入
├── utils/                    # 工具函数
└── main.py                   # FastAPI 入口

frontend/src/
├── assets/                   # 静态资源 (CSS、图片)
├── auth/                     # 认证逻辑 (sideEffects)
├── components/
│   ├── aiagent/              # AI 组件
│   ├── article/              # 文章组件
│   ├── basic/                # 基础组件
│   ├── bento/                # Bento 网格布局
│   ├── blog/                 # 博客组件
│   ├── books/                # 书籍组件
│   ├── editor/               # Markdown 编辑器
│   ├── icons/                # 图标组件
│   ├── layout/               # 布局组件
│   ├── map/                  # 地图组件
│   ├── memo/                 # 备忘录组件
│   ├── message/              # 消息组件
│   ├── nav/                  # 导航组件
│   └── ui/                   # shadcn-vue UI 组件
├── data/                     # 静态数据
├── layouts/                  # 布局组件
├── lib/                      # 第三方库封装
├── router/                   # Vue Router 配置
├── service/                  # API 调用封装 (按领域拆分)
├── stores/                   # Pinia 状态管理
│   ├── auth.ts               # 认证状态
│   ├── counter.ts            # 计数器
│   ├── notification.ts       # 通知状态
│   ├── theme.ts              # 主题状态
│   └── todos.ts              # 待办状态
├── types/                    # TypeScript 类型定义
├── utils/                    # 工具函数
└── views/                    # 页面组件
    ├── analyse/              # 分析页面
    ├── auth/                 # 认证页面
    ├── blog/                 # 博客页面
    ├── books/                # 书籍页面
    ├── entry/                # 入口页面
    ├── general/              # 通用页面
    ├── pic/                  # 图片页面
    ├── rss/                  # RSS 页面
    └── toolbox/              # 工具箱页面

react-app/src/
├── api/                      # API 请求封装 (request, csrf, refresh)
├── auth/                     # 认证逻辑 (hydrate, tokenService, heartbeat)
├── assets/                   # 静态资源 (CSS, Lottie 动画)
├── components/
│   ├── basic/                # 基础组件 (BasicLayout, BasicDetail, BasicFooter)
│   ├── bento/                # Bento 卡片组件
│   ├── books/                # 书籍组件
│   └── editor/               # Markdown 编辑器
├── router/                   # React Router 配置
├── services/                 # 服务层 (blog, book, rss, todo, gallery, upload)
├── stores/                   # Zustand 状态管理
│   ├── authState.ts          # 认证状态
│   ├── deviceState.ts        # 设备状态 (isMobile)
│   ├── notificationState.ts  # 通知状态
│   ├── themeState.ts         # 主题状态
│   └── todoState.ts          # 待办状态
├── types/                    # TypeScript 类型定义
├── utils/                    # 工具函数 (formatdate, imageCompressor, visitorTracker)
├── views/                    # 页面组件
│   ├── Auth/                 # 认证页面
│   ├── Blog/                 # 博客页面
│   ├── Book/                 # 书籍页面
│   ├── FishingMap/           # 钓鱼地图
│   ├── Home/                 # 首页 (Bento 布局)
│   ├── NotFound/             # 404 页面
│   ├── Pic/                  # 图片页面
│   ├── ReadingList/          # 阅读清单
│   ├── Toolbox/              # 工具箱
│   └── general/              # 通用页面
├── App.tsx                   # React 入口
└── main.tsx                  # React 渲染入口
```

## 架构设计

### 总体架构（前后端分离 + 移动端自动分流）

- **Frontend (Vue 3 + TypeScript)**：桌面端 SPA，负责页面渲染、交互状态管理、路由与鉴权守卫。
- **React App (React 19 + TypeScript)**：移动端 SPA，针对移动设备优化，提供触控友好的界面。
- **Backend (FastAPI)**：负责 REST API、业务编排、认证授权、任务调度。
- **Data Layer**：PostgreSQL（核心业务数据）+ MongoDB（文档型数据）+ Redis（缓存/会话）+ RabbitMQ（异步队列）。

```mermaid
flowchart LR
    U[User Browser] --> D{Device?\nMobile?}
    D -->|Yes| R[React App\n:5174]
    D -->|No| F[Vue App\n:5173]
    F -->|HTTP / Cookie / CSRF| B[Backend API\nFastAPI]
    R -->|HTTP / Cookie / CSRF| B
    B --> PG[(PostgreSQL)]
    B --> MG[(MongoDB)]
    B --> RD[(Redis)]
    B --> RMQ[(RabbitMQ)]
    B --> TQ[Taskiq Worker]
```

### 自动分流机制

访问根路径时，通过 **UA 解析** 自动识别设备类型：
- **移动端** (device_type = `mobile` / `tablet`) → 重定向到 React App
- **桌面端** (device_type = `desktop`) → 访问 Vue App

开发环境：桌面端 `:5173`，移动端 `:5174`
生产环境：通过 Nginx 配置根据 `User-Agent` 头实现自动分流。

### 后端分层设计

- **API 层 (`api/v1`)**：参数校验、鉴权、响应封装，不承载复杂业务。
- **Service 层 (`services`)**：核心业务逻辑，组合仓储与外部依赖。
- **Repository 层 (`repositories`)**：数据访问抽象，隔离 SQL/ORM 查询细节。
- **Schema 层 (`schemas`)**：请求/响应模型定义，保证输入输出契约稳定。
- **Core/Tasks 层 (`core`, `tasks`)**：配置、日志、异常处理、异步任务与定时任务。

### 前端模块设计

#### Vue 桌面端
- **Views (`views/`)**：页面级容器，按业务领域组织。
- **Components (`components/`)**：可复用 UI 组件，减少重复实现。
- **Stores (`stores/`)**：Pinia 全局状态（用户、主题、通知、业务状态）。
- **Auth + Service (`auth/`, `service/`)**：认证副作用、token 续期、API 调用封装。
- **Router (`router/`)**：路由注册、权限拦截、页面元信息管理。

#### React 移动端
- **Views (`views/`)**：页面级组件，按业务领域组织（Bento 布局）。
- **Components (`components/`)**：可复用组件，触控优化。
- **Stores (`stores/`)**：Zustand 轻量状态管理（认证、设备、主题、通知）。
- **Auth + Services (`auth/`, `services/`)**：认证服务、API 调用封装。
- **Router (`router/`)**：React Router 路由配置、loader 权限守卫。

### 关键设计原则

1. **分层解耦**：高内聚，低耦合。UI、业务、数据访问分离，降低耦合便于演进。
2. **类型优先**：前端 TypeScript + 后端 Pydantic，减少接口漂移。
3. **安全默认**：JWT/Cookie + CSRF 防护 + WebAuthn/Passkey + 输入校验。
4. **异步扩展**：Taskiq + RabbitMQ/Redis 支撑耗时任务与后台处理。
5. **可维护性**：统一 lint/format/type-check/test 流程，保持代码一致性。

## API 端点 (:5555)

| 路由               | 描述                      |
| ------------------ | ------------------------- |
| `/api/v1/auth`     | 认证 (登录/注册/Passkey/OAuth) |
| `/api/v1/books`    | 书籍管理 (CRUD、阅读进度) |
| `/api/v1/users`    | 用户资料 (设置、头像)     |
| `/api/v1/blog`     | 博客系统 (文章/评论/分类) |
| `/api/v1/messages` | 留言板                    |
| `/api/v1/weread`   | 微信读书导入              |
| `/api/v1/rss`      | RSS 订阅器                |
| `/api/v1/admin`    | 管理员 (内容审核)         |
| `/api/v1/ai`       | AI 助手 (文章摘要)        |
| `/api/v1/todos`    | 待办事项                  |
| `/api/v1/monitor`  | 系统监控                  |
| `/api/v1/public`   | 公共接口                  |
| `/api/v1/publish`  | 文章发布                  |

## 定时任务

| 任务 | 调度规则 | 功能 |
|------|----------|------|
| `refresh_rss_feeds` | 每天 10:00 (Asia/Shanghai) | 刷新所有 RSS 订阅源 |
| `run_migration_job` | 每 30 分钟 | 迁移 Redis 访客数据到 PostgreSQL |
| `check_user_heartbeats` | 定时 | 检查用户心跳 |
| `send_todo` | 每天 09:00 | 发送待办提醒（飞书通知） |

## 配置

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql+psycopg2://user:pass@localhost/readinglist
MONGO_URI=mongodb://localhost:27017/readinglist
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
```

## 代码风格

- **后端**: Ruff (79字符, 4空格, 双引号), Python 3.14+ 类型注解
- **前端**: Prettier + ESLint + Oxlint, Tailwind CSS, `<script setup lang="ts">`
- **详细规范**: 见 [CLAUDE.md](./CLAUDE.md)

## 提交规范

1. 后端提交前: `cd backend && ruff format . && ruff check .`
2. Vue 前端提交前: `cd frontend && pnpm format && pnpm lint && pnpm type-check`
3. React 移动端提交前: `cd react-app && pnpm lint && pnpm type-check`
4. 提交信息: Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`)
5. 分支命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`

## 部署

- **在线演示**: [Kuroome's Blog](https://kanocifer.chat)
- **本地端口**: 后端 `:5555` / Vue 桌面端 `:5173` / React 移动端 `:5174`
- **生产分流**: 通过 Nginx 根据 `User-Agent` 自动将移动端用户路由到 React App

## License

MIT
