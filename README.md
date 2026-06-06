# kanocifer.chat

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

基于 **FastAPI + Vue 3 + React** 的全栈阅读清单管理与个人博客系统，支持**桌面端/移动端自动分流**，并提供钓点智能指数与天气融合分析能力。

> 在线地址: [https://kanocifer.chat](https://kanocifer.chat)
> 项目名称 kanocifer 来源于日语「黒猫」的罗马音，寓意神秘、独立、敏捷，象征着这个项目的核心价值：为用户提供一个高效、灵活、个性化的阅读与交流平台。

---

## 目录

- [功能特性](#功能特性)
- [界面预览](#界面预览)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [常用命令](#常用命令)
- [项目结构](#项目结构)
- [架构设计](#架构设计)
- [API 端点](#api-端点-5555)
- [定时任务](#定时任务)
- [环境变量](#环境变量)
- [代码风格](#代码风格)
- [提交规范](#提交规范)
- [部署](#部署)
- [License](#license)

---

## 功能特性

### 核心功能

| 功能模块         | 描述                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **用户系统**     | 注册（邮箱验证）、登录、个人资料、JWT/Cookie 认证、Passkey (WebAuthn) 无密码登录、GitHub OAuth 绑定 |
| **博客系统**     | 文章发布/编辑（Markdown 编辑器 + 自动保存草稿）、分类、评论（Twikoo）、审核管理             |
| **微信读书**     | 书架同步、全屏书架视图、阅读统计（周/月/年/总）、阅读进度追踪（Vue/React 双端）             |
| **RSS 阅读器**   | RSS 订阅解析、文章聚合、已读标记、图片代理、定时自动刷新                                     |
| **AI 助手**      | 文章总结 + AI 对话（SSE 流式响应）、会话历史缓存                                             |
| **钓点智能分析** | 专家规则（9 特征加权）→ ML 残差校准（Ridge 回归），融合天气/潮汐数据，反馈闭环自动训练      |
| **订阅管理**     | 付费订阅追踪、账单周期计算、月度费用统计、到期提醒（飞书/Bark/邮件，可配多渠道）            |
| **设备管理**     | 设备资产跟踪、里程碑提醒（100 天/1 年等）、每日成本分析、价格趋势图                         |
| **开发任务看板** | Kanban 三列（待办/进行中/完成），优先级排序、拖拽排序                                         |
| **留言板**       | 访客留言、审核管理                                                                           |
| **友链管理**     | 友链 CRUD、排序、每日精选轮换、友链申请表单                                                  |
| **图库管理**     | 图片上传、拖拽重排、全屏查看，DB + Redis 双写持久化存储                                       |
| **图片工具箱**   | 浏览器端图片压缩 + 格式转换（WebP/JPEG/PNG），纯本地处理                                     |

### 基础设施

| 功能模块         | 描述                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **多主题系统**   | Vue/React 双端 7 套配色方案（森林绿、天空蓝、玫瑰红、薄雾等），CSS 自定义属性一键切换       |
| **Bento 首页**   | Vue 端 13 个卡片可拖拽重排，支持布局保存/重置；React 端纯 CSS 网格布局                      |
| **背景图切换**   | 固定/随机背景图选择器，多张高质量背景                                                        |
| **通知渠道**     | 飞书 Webhook + Bark 推送 + 邮件（FastMail），Redis 去重 + 分布式锁防并发                     |
| **实时访客统计** | WebSocket 在线人数，Redis Set + Hash 多标签页引用计数，Pub/Sub 广播，支持水平扩展            |
| **后台监控**     | 访客分析（浏览器/OS/页面/趋势）、登录日志、服务器状态（CPU/内存/磁盘）实时流                |
| **系统状态页**   | 公开状态页：版本信息、服务指标、系统信息、WebSocket 延迟图                                   |
| **SEO 支持**     | robots.txt + sitemap.xml 自动生成（含博客文章），1 小时缓存                                  |
| **点赞系统**     | 站点级点赞，Redis 存储，每日 25 次限流                                                       |
| **AI 天气分析**  | LLM 驱动天气分析流式响应，React 钓鱼地图集成                                                 |
| **自动分流**     | 根据 User-Agent 自动将移动端路由到 React App，桌面端访问 Vue App                             |
| **自动部署**     | Gitee webhook 自动部署，HMAC 签名验证                                                        |
| **Cookie 同意**  | GDPR 合规 Cookie 同意弹窗                                                                    |
| **安全**         | CSRF 保护、JWT（12h access + 30d refresh）、权限控制、WebAuthn/Passkey、GitHub OAuth          |

## 界面预览

| 首页 Bento 布局 |
|:---:|
| ![首页](docs/images/首页.png) |

| 关于页面 | 主题系统 |
|:---:|:---:|
| ![关于](docs/images/关于.png) | ![主题系统](docs/images/主题系统.png) |

Bento 首页支持 13 个卡片拖拽重排与布局保存；7 套配色方案可一键切换，覆盖暗色/亮色模式。

## 技术栈

- **后端**: FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL + MongoDB (Beanie) + Redis + Taskiq (RabbitMQ)
- **桌面端 (Vue)**: Vue 3.5 + TypeScript + Vite + Tailwind CSS v4 + Pinia + shadcn-vue + motion-v
- **移动端 (React)**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + Framer Motion
- **AI/智能能力**: Agno + 钓点指数推理模型（`fishing_scaler.joblib`、`fishing_residual_model.joblib`）
- **数据接入**: weatherGateway + fishingGateway（Vue/React 双端对齐）
- **安全**: JWT 认证、CSRF 保护、WebAuthn/Passkey、GitHub OAuth

## 快速开始

```bash
# 1. 后端环境
cd backend
uv sync
source .venv/bin/activate

# 2. 配置环境变量
cp .env.example .env  # 编辑 .env 配置数据库等

# 3. 数据库迁移
uv run alembic upgrade head

# 4. 启动开发服务器
uv run python3 dev.py      # 后端 :5555
cd ../frontend && pnpm install && pnpm run dev  # 桌面端 :5173
cd ../react-app && pnpm install && pnpm run dev # 移动端 :5174
```

- 桌面端: `http://localhost:5173` (Vue)
- 移动端: `http://localhost:5174` (React)

## 常用命令

### 后端

```bash
cd backend
uv run python3 dev.py                    # 启动 (:5555)
ruff format . && ruff check .            # 格式化 + 检查
ruff check . --fix                        # 自动修复
uv run alembic revision --autogenerate -m "x"  # 生成迁移
uv run alembic upgrade head              # 执行迁移

# 测试
uv run pytest                                      # 运行所有测试
uv run pytest test/test_main.py -v                 # 单个测试文件
uv run pytest test/core/test_config.py::test_config_loading -v  # 单个测试函数
uv run pytest -k "config" -v                       # 按关键字过滤
uv run pytest --tb=short                            # 简短 traceback
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
pnpm run format                         # Prettier 格式化
pnpm run build                          # 完整构建 (type-check + compile)
pnpm run build-only                     # 仅构建 (跳过 type-check)
```

## 项目结构

```
backend/app/
├── api/
│   ├── des/                  # 依赖注入 (认证、CSRF、DB、Redis、限流)
│   ├── v1/                   # API v1 端点
│   │   ├── admin.py         # 管理员 (内容审核、自动部署)
│   │   ├── ai.py            # AI 助手 (总结/对话/历史)
│   │   ├── auth.py          # 认证 (登录/注册/Passkey/OAuth)
│   │   ├── blog.py          # 博客系统 (文章/评论/分类)
│   │   ├── messages.py      # 留言板
│   │   ├── monitor.py       # 系统监控 (访客分析/服务器状态)
│   │   ├── public.py        # 公共接口 (状态/点赞/SEO/天气分析/图库)
│   │   └── rss.py           # RSS 订阅器
│   └── v2/                   # API v2 端点
│       ├── device.py        # 设备管理
│       ├── devtasks.py      # 开发任务看板
│       ├── fishing.py       # 钓点智能指数
│       ├── friendlinks.py   # 友链管理
│       ├── public.py        # WebSocket 实时访客
│       ├── subscriptions.py # 订阅管理
│       ├── weather.py       # 天气数据
│       └── weread.py        # 微信读书
├── core/                     # 核心配置 (config, security, exceptions, AI Agent)
├── models/
│   ├── models.py            # SQLAlchemy 关系模型 (User, Profile, Subscription, Device, etc.)
│   ├── beanie.py            # MongoDB 文档模型 (Post, MessageBoard, RssArticle, DevTask, etc.)
│   ├── fishing.py           # 钓鱼模型 (FishingRecord, FishingModelMeta)
│   └── weread.py            # 微信读书模型 (WereadBook, UserBook, Archive)
├── repositories/             # 数据访问层
├── schemas/                  # Pydantic schemas (按领域拆分)
├── services/                 # 业务逻辑层
│   ├── user/                # 用户认证子包 (UserService, GitHubAuth, Passkey)
│   ├── weread/              # 微信读书子包 (Shelf, Stats)
│   └── fishing/             # 钓鱼子包 (ExpertScorer, ModelService)
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
├── api/                      # API Gateway 层 (按领域拆分，直接调用后端)
├── assets/                   # 静态资源 (CSS、图片)
├── auth/                     # 认证逻辑 (sideEffects)
├── components/
│   ├── ai/                   # AI 天气分析组件
│   ├── article/              # 文章组件
│   ├── basic/                # 基础组件 (布局、导航、地图容器)
│   ├── bento/                # Bento 网格卡片组件
│   ├── blog/                 # 博客组件 (Twikoo 评论)
│   ├── books/                # 书籍组件
│   ├── editor/               # Markdown 编辑器
│   ├── friendlink/           # 友链申请表单
│   ├── icons/                # 图标组件
│   ├── layout/               # 布局组件 (背景切换、主题、Cookie 同意)
│   ├── map/                  # 天气/潮汐可视化组件
│   ├── memo/                 # 备忘录组件
│   ├── message/              # 留言板/评论管理组件
│   ├── nav/                  # 导航组件
│   └── ui/                   # shadcn-vue UI 组件
├── composables/              # Vue 组合式函数
├── data/                     # 静态数据
├── layouts/                  # 布局组件
├── lib/                      # 第三方库封装
├── plugins/                  # Vue 插件
├── router/                   # Vue Router 配置
├── stores/                   # Pinia 状态管理
│   ├── auth.ts               # 认证状态
│   ├── counter.ts            # 计数器
│   ├── notification.ts       # 通知状态
│   ├── theme.ts              # 主题状态
│   └── todos.ts              # 待办状态
├── types/                    # TypeScript 类型定义
├── utils/                    # 工具函数
└── views/                    # 页面组件
    ├── analytics/            # 后台分析 (访客/服务器监控)
    ├── auth/                 # 认证页面 (登录/注册/设置)
    ├── blog/                 # 博客页面 (列表/文章/编辑器)
    ├── books/                # 微信读书 (书架/统计/导入)
    ├── device/               # 设备管理 (资产跟踪/成本分析)
    ├── entry/                # Bento 首页 (13 个可拖拽卡片)
    ├── fishing/              # 钓鱼地图 (指数/反馈/天气)
    ├── messages/             # 留言/评论管理
    ├── pages/                # 静态页面 (关于/友链/状态/隐私/更新日志)
    ├── pic/                  # 图库管理
    ├── rss/                  # RSS 阅读器
    ├── subscription/         # 订阅管理 (费用/提醒)
    ├── todos/                # 开发任务看板
    └── toolbox/              # 图片工具箱 (压缩/格式转换)

react-app/src/
├── api/                      # API 请求封装 (request, csrf, refresh)
├── auth/                     # 认证逻辑 (hydrate, tokenService, heartbeat)
├── assets/                   # 静态资源 (CSS, Lottie 动画)
├── components/
│   ├── basic/                # 基础组件 (布局、导航、Cookie 同意、设置)
│   ├── bento/                # Bento 卡片组件
│   ├── blog/                 # Twikoo 评论组件
│   └── books/                # 书籍组件
├── hooks/                    # 自定义 Hooks
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
│   ├── Analytics/            # 后台分析 (访客/登录日志/服务器状态)
│   ├── Auth/                 # 认证页面 (登录/注册/设置)
│   ├── Blog/                 # 博客页面 (列表/文章)
│   ├── BookShelf/            # 微信读书 (书架/统计)
│   ├── device/               # 设备管理 (资产跟踪/成本分析)
│   ├── FishingMap/           # 钓鱼地图 (AI 天气分析/潮汐/指数)
│   ├── Home/                 # Bento 首页
│   ├── NotFound/             # 404 页面
│   ├── pages/                # 静态页面 (友链/状态)
│   ├── Pic/                  # 图库管理
│   ├── Rss/                  # RSS 阅读器
│   ├── subscription/         # 订阅管理 (费用/提醒)
│   ├── Todo/                 # 开发任务看板
│   ├── Toolbox/              # 图片工具箱
│   ├── Website/              # 网站目录
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
    U[User Browser] --> D{Mobile?}
    D -->|Yes| R[React App\nm.kanocifer.chat]
    D -->|No| F[Vue App\nkanocifer.chat]
    F -->|HTTP / Cookie / CSRF| B[Backend API\nFastAPI]
    R -->|HTTP / Cookie / CSRF| B
    B --> PG[(PostgreSQL)]
    B --> MG[(MongoDB)]
    B --> RD[(Redis)]
    B --> RMQ[(RabbitMQ)]
    B --> TQ[Taskiq Worker]
```

### Fishing Index 服务架构
![架构设计图](./docs/Fishing-Index.png)

### 自动分流机制

访问根路径时，通过 **UA 解析** 自动识别设备类型：

- **移动端** (device_type = `mobile` / `tablet`) → 重定向到 React App
- **桌面端** (device_type = `desktop`) → 访问 Vue App

开发环境：桌面端 `:5173`，移动端 `:5174`
生产环境：通过 Nginx 配置根据 `User-Agent` 头实现自动分流。

### 后端分层设计

- **API 层 (`api/v1`, `api/v2`)**：参数校验、鉴权、响应封装，不承载复杂业务。
- **Service 层 (`services`)**：核心业务逻辑，组合仓储与外部依赖。
- **Repository 层 (`repositories`)**：数据访问抽象，隔离 SQL/ORM 查询细节。
- **Schema 层 (`schemas`)**：请求/响应模型定义，保证输入输出契约稳定。
- **Core/Tasks 层 (`core`, `tasks`)**：配置、日志、异常处理、异步任务与定时任务。

### 前端模块设计

#### Vue 桌面端

- **Views (`views/`)**：页面级容器，按业务领域组织。
- **Components (`components/`)**：可复用 UI 组件，减少重复实现。
- **Stores (`stores/`)**：Pinia 全局状态（用户、主题、通知、业务状态）。
- **API Gateway (`api/`)**：按领域拆分的 Gateway 层，直接调用后端 API。
- **Auth (`auth/`)**：认证副作用、token 续期。
- **Composables (`composables/`)**：Vue 组合式函数，复用业务逻辑。
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

| 路由                       | 描述                                        |
| -------------------------- | ------------------------------------------- |
| `/api/v1/auth`             | 认证 (登录/注册/Passkey/OAuth/用户资料)     |
| `/api/v1/blog`             | 博客系统 (文章/评论/分类)                   |
| `/api/v1/rss`              | RSS 订阅器 (订阅/文章/刷新)                 |
| `/api/v1/agent`            | AI 助手 (文章总结/AI 对话/会话历史)         |
| `/api/v1/messages`         | 留言板                                      |
| `/api/v1/admin`            | 管理员 (内容审核/分析/自动部署)             |
| `/api/v1/status`           | 系统监控 (访客分析/登录日志/服务器状态)     |
| `/api/v1/public`           | 公共接口 (状态/点赞/SEO/天气分析/图库)      |
| `/api/v2/weread`           | 微信读书 (书架同步/阅读统计/进度)           |
| `/api/v2/fishing`          | 钓点智能指数 (计算/反馈/统计/模型权重)      |
| `/api/v2/subscriptions`    | 订阅管理 (CRUD/提醒配置/到期检测)           |
| `/api/v2/device`           | 设备管理 (CRUD/里程碑/提醒)                 |
| `/api/v2/weather`          | 天气数据 (潮汐/完整天气)                    |
| `/api/v2/friend-links`     | 友链管理 (CRUD/排序)                        |
| `/api/v2/devtasks`         | 开发任务看板 (CRUD/排序)                    |
| `/api/v2/publicv2/ws`      | WebSocket 实时访客统计                      |

### 最近改动（v3.2.0）

- **微信读书书架**：新增书架 API 和全屏书架视图，阅读统计双端同步（Vue + React）。
- **后端架构重构**：服务层拆分为独立包模块（user、weread、friend_link），统一响应格式和错误处理，提取 SSE/FriendLinkRepo/中间件为独立模块。
- **API 清理**：移除遗留 v1 Book CRUD，BentoReadingList 全面迁移至 v2 weread API；清理旧表和遗留代码。
- **前端简化**：Vue 端移除 service 层，直接调用 gateway；整合 fishing_service。
- **状态页**：新增服务/系统信息卡片，React 端同步嵌套 API 结构。
- **登录重设计**：分屏布局重构登录/注册页面。
- **多主题 & 背景**：React 端主题支持、新增多张背景图、背景自动切换暂停逻辑。

<details>
<summary>v3.0.0 历史改动</summary>

- **多主题系统**：Vue/React 双端 7 套配色方案，基于 CSS 自定义属性实现一键切换。
- **钓鱼升级**：AI 天气分析（支持模型切换）、后台训练任务、柱状图降水显示、移动端横向滑动修复。
- **基础设施**：背景图固定/随机选择器、Averia 装饰字体、Cookie 同意弹窗、访客 WebSocket 实时统计。
- **相册重构**：图片存储从文件系统迁移至 PostgreSQL 持久化。
- **架构清理**：废弃 `frontend-architecture-analysis.md`，移除无用静态资源。

</details>

## 定时任务

| 任务                      | 调度规则                   | 功能                                       |
| ------------------------- | -------------------------- | ------------------------------------------ |
| `refresh_rss_feeds`       | 每天 10:00 (Asia/Shanghai) | 刷新所有 RSS 订阅源，飞书推送刷新统计      |
| `run_migration_job`       | 每 1 小时                  | 批量迁移 Redis 访客数据到 PostgreSQL        |
| `send_daily_summary`      | 每天 08:00                 | 昨日访客分析日报（Top 页面/浏览器/OS）飞书推送 |
| `send_todo`               | 每天 09:00                 | 未完成待办提醒飞书推送                      |
| `subscription_check_task` | 每 4 小时                  | 订阅到期提醒（30/7/3/1 天前 + 当天）       |
| `check_device_milestones` | 按需触发                   | 设备里程碑通知（100 天/1 年等）             |

## 环境变量

复制 `backend/.env.example` 为 `backend/.env`，按需配置：

### 必填

| 变量 | 说明 | 示例 |
|------|------|------|
| `SECRET_KEY` | JWT 签名密钥 | `openssl rand -hex 32` 生成 |
| `DATABASE_URL` | PostgreSQL 异步连接串 | `postgresql+asyncpg://user:pass@localhost/dbname` |
| `MONGO_URI` | MongoDB 连接串 | `mongodb://localhost:27017/` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379/0` |
| `RABBITMQ_URL` | RabbitMQ 连接串（Taskiq 任务队列） | `amqp://guest:guest@localhost:5672/` |

### 认证 & 安全

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CSRF_COOKIE_SECURE` | CSRF Cookie 是否仅 HTTPS | `True` |
| `WEBAUTHN_RP_ID` | WebAuthn Relying Party ID | `kanocifer.chat` |
| `WEBAUTHN_ORIGIN` | WebAuthn Origin | `https://kanocifer.chat` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | — |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | — |
| `GITHUB_REDIRECT_URI` | GitHub OAuth 回调地址 | `http://localhost:5555/api/v1/auth/github/callback` |
| `JWT_PRIVATE_KEY` | 自定义 JWT 私钥（可选） | — |
| `COOKIE_DOMAIN` | Cookie 跨域域名（生产环境设置） | — |

### 邮件 & 通知

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MAIL_USERNAME` | 邮件发送账号 | — |
| `MAIL_PASSWORD` | 邮件发送密码 | — |
| `ADMIN_EMAIL` | 管理员邮箱（接收通知） | — |
| `FEISHU_WEBHOOK_URL` | 飞书 Webhook 地址（任务提醒/日报） | — |
| `SEND_BOOT_EMAIL` | 启动时是否发送通知邮件 | `True` |

### AI & 第三方服务

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `API_KEY` | AI 服务 API Key（文章总结/对话） | — |
| `AMAP_SECURITY_CODE` | 高德地图安全密钥 | — |
| `AMAP_WEB_KEY` | 高德地图 Web 服务 Key | — |
| `AMAP_KEY_ALLOWED_ORIGINS` | 允许获取高德密钥的前端来源（逗号分隔） | `http://localhost:5173,...` |
| `QWEATHER_BASE_URL` | 和风天气 API 基础地址 | — |
| `VITE_JS_API_TOKEN` | 前端 API Token | — |

### 运维 & 调试

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `REDIS_MAX_CONNECTIONS` | Redis 连接池最大连接数 | `50` |
| `ENABLE_TRACKING` | 是否启用访客追踪 | `True` |
| `SAVE_LOGS` | 是否保存日志 | `True` |
| `ADMIN_USER_IDS` | 管理员用户 ID 列表 | `[1, 2]` |
| `GITEE_WEBHOOK_SECRET` | Gitee 自动部署 Webhook 密钥 | — |
| `FRONTEND_URL` | 前端地址（CORS/重定向） | `https://kanocifer.chat` |
| `DB_MIGRATE_URL` | 数据库迁移用同步连接串（Alembic） | `postgresql+psycopg://user:pass@localhost/dbname` |

## 代码风格

- **后端**: Ruff (79字符, 4空格, 双引号), Python 3.14+ 类型注解
- **前端**: Prettier + ESLint + Oxlint, Tailwind CSS, `<script setup lang="ts">`
- **详细规范**: 见 [CLAUDE.md](./CLAUDE.md)

## 提交规范

1. 后端提交前: `cd backend && ruff format . && ruff check .`
2. Vue 前端提交前: `cd frontend && pnpm format && pnpm lint && pnpm type-check`
3. React 移动端提交前: `cd react-app && pnpm format && pnpm lint && pnpm type-check`
4. 提交信息: Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`)
5. 分支命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`

## 部署

- **在线演示**: [Kuroome's Blog](https://kanocifer.chat)
- **本地端口**: 后端 `:5555` / Vue App `:5173` / React App `:5174`
- **生产分流**: 通过 Nginx 根据 `User-Agent` 自动将移动端用户路由到 React App

## License

MIT
