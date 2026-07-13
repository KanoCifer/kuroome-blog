# kanocifer.chat

[![Python](https://img.shields.io/badge/Python-v3.14%2B-3776AB?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vue](https://img.shields.io/badge/Vue-v3.5-42b883?logo=vue.js)](https://vuejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react)](https://react.dev/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-v2.0-D71F00)](https://www.sqlalchemy.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6%2F7-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-8-d82c20?logo=redis)](https://redis.io/)
[![Pinia](https://img.shields.io/badge/Pinia-3-7b3fe4?logo=pinia)](https://pinia.vuejs.org/)
[![Zustand](https://img.shields.io/badge/Zustand-5-FFB000?logo=zustand)](https://zustand-demo.pmnd.rs/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-FF6600?logo=rabbitmq)](https://www.rabbitmq.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev/)
[![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go)](https://go.dev/)

基于 **FastAPI + Go + Vue 3 + React** 的全栈个人网站，支持**桌面端/移动端自动分流**。

> 在线地址: [https://kanocifer.chat](https://kanocifer.chat)

---

## 目录

- [功能特性](#功能特性)
  - [核心功能](#核心功能)
  - [基础设施](#基础设施)
- [界面预览](#界面预览)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [架构设计](#架构设计)
  - [总体架构](#总体架构前后端分离--移动端自动分流)
  - [API 端点](#api-端点-5555)
  - [最近改动](#最近改动v410--v450)
- [定时任务](#定时任务)
- [环境变量](#环境变量)
- [更多信息](#更多信息快速开始--代码风格)
- [License](#license)

---

## 功能特性

### 核心功能

| 功能模块         | 描述                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **用户系统**     | 注册（邮箱验证）、登录、个人资料、JWT/Cookie 认证、Passkey (WebAuthn) 无密码登录、GitHub OAuth 绑定 |
| **博客系统**     | 文章发布/编辑（Markdown 编辑器 + 自动保存草稿）、分类、评论（Twikoo 主题适配）、审核管理            |
| **微信读书**     | 书架同步、全屏书架视图、阅读统计（周/月/年/总）、阅读进度追踪（Vue/React 双端）                     |
| **RSS 阅读器**   | RSS 订阅解析、文章聚合、已读标记、图片代理、定时自动刷新                                            |
| **AI 助手**      | 文章总结 + AI 对话（SSE 流式响应）、会话历史缓存、模型选择                                          |
| **碎碎念**       | 类 Twitter 轻量动态（图片/链接/书籍/引用附件、标签、心情、定位、可见性控制），Vue/React 双端        |
| **钓点智能分析** | 专家规则（9 特征加权）→ ML 残差校准（Ridge 回归），融合天气/潮汐数据，反馈闭环自动训练              |
| **订阅管理**     | 付费订阅追踪、账单周期计算、月度费用统计、到期提醒（飞书/Bark/邮件，可配多渠道）                    |
| **设备管理**     | 设备资产跟踪、里程碑提醒（100 天/1 年等）、每日成本分析、价格趋势图                                 |
| **开发任务工作台** | 三视角工作台（推进/规划/回顾），优先级 P0-P3、类型与范围、验收标准与约束、依赖阻塞与 frontier 全局悬浮抽屉，Vue 桌面端                                  |
| **留言板**       | 访客留言、审核管理                                                                                  |
| **友链管理**     | 友链 CRUD、排序、每日精选轮换、友链申请表单                                                         |
| **图库管理**     | 图片上传、瀑布流布局、全屏查看，DB + Redis 双写持久化存储                                           |
| **图片工具箱**   | 浏览器端图片压缩 + 格式转换（WebP/JPEG/PNG），纯本地处理                                            |

### 基础设施

| 功能模块         | 描述                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| **多主题系统**   | Vue/React 双端 4 套配色方案（paper / sage / mist / blush），CSS 自定义属性一键切换                         |
| **Bento 首页**   | Vue 端可拖拽重排卡片，支持布局保存/重置；React 端纯 CSS 网格布局                                           |
| **背景图切换**   | 固定/随机背景图选择器，精选多张高质量背景                                                                  |
| **通知渠道**     | 飞书 Webhook + Bark 推送 + 邮件（FastMail），Redis 去重 + 分布式锁防并发                                   |
| **实时访客统计** | WebSocket 在线人数，Redis Set + Hash 多标签页引用计数，Pub/Sub 广播，支持水平扩展                          |
| **后台监控**     | 访客分析（浏览器/OS/页面/趋势）、登录日志、服务器状态（CPU/内存/磁盘）实时流（仅 Vue 管理端）              |
| **系统状态页**   | 公开状态页：版本信息、服务指标、系统信息、WebSocket 延迟图、日志查询（`/api/v2/system/log`）               |
| **SEO 支持**     | robots.txt + sitemap.xml 自动生成（含博客文章），1 小时缓存                                                |
| **点赞系统**     | 站点级点赞，Redis 存储，每日 25 次限流                                                                     |
| **AI 天气分析**  | LLM 驱动天气分析流式响应，React 钓鱼地图集成                                                               |
| **自动分流**     | 根据 User-Agent 自动将移动端路由到 React App，桌面端访问 Vue App                                           |
| **自动部署**     | Gitee webhook 自动部署，HMAC 签名验证                                                                      |
| **Cookie 同意**  | GDPR 合规 Cookie 同意弹窗                                                                                  |
| **后端日志**     | slog 结构化日志（双文件路由 + trace_id + lumberjack 轮转）、event 表 + `/api/v3/system/events` 查询        |
| **安全**         | JWT（12h access + 30d refresh）+ SameSite Cookie + 权限控制 + WebAuthn/Passkey + GitHub OAuth              |
| **Go 后端**      | Gin 框架独立服务（`go-backend/`），路由前缀 `/api/v3/*`，已承载认证/Blog/Passkey/Admin，逐步替代 Python 层 |
| **Docker 支持**  | Go 后端多阶段 Dockerfile + `.dockerignore`， Alpine 最小镜像                                               |

## 界面预览

|        首页 Bento 布局        |
| :---------------------------: |
| ![首页](docs/images/首页.png) |

|           关于页面            |               主题系统                |
| :---------------------------: | :-----------------------------------: |
| ![关于](docs/images/关于.png) | ![主题系统](docs/images/主题系统.png) |

Bento 首页支持 13 个卡片拖拽重排与布局保存；4 套配色方案可一键切换，覆盖暗色/亮色模式。

## 技术栈

- **后端**: FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL + MongoDB (Beanie) + Redis + Taskiq (RabbitMQ) + slog 结构化日志（双文件路由 + trace_id + lumberjack 轮转）
- **Go 后端**: Gin + slog + Redis，路由前缀 `/api/v3/*`，多阶段 Docker 构建
- **桌面端 (Vue)**: Vue 3.5 + TypeScript + Vite 8 + Tailwind CSS v4 + Pinia 3 + motion-v + ECharts 6 + liquid-glass 导航
- **移动端 (React)**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Zustand 5 + Framer Motion + ECharts 6
- **AI/智能能力**: Agno + 自建钓点指数推理模型 + LLM 总结/对话（模型可选择）
- **数据接入**: weatherGateway + fishingGateway（Vue/React 双端对齐）
- **安全**: JWT 认证、WebAuthn/Passkey、GitHub OAuth

## 项目结构

```
backend/app/
├── api/
│   ├── des/                  # 依赖注入 (认证、DB、Redis、限流、系统服务)
│   ├── v1/                   # API v1 端点
│   │   ├── admin.py         # 管理员 (内容审核、自动部署)
│   │   ├── auth.py          # 认证 (登录/注册/Passkey/OAuth)
│   │   ├── blog.py          # 博客系统 (文章/评论/分类)
│   │   ├── moments.py       # 碎碎念 (动态 CRUD)
│   │   ├── monitor.py       # 系统监控 (访客分析/服务器状态)
│   │   ├── public.py        # 公共接口 (状态/点赞/SEO/天气分析/图库)
│   │   ├── publish.py       # 发布接口
│   │   └── rss.py           # RSS 订阅器
│   └── v2/                   # API v2 端点
│       ├── device.py        # 设备管理
│       ├── devtasks.py      # 开发任务看板
│       ├── fishing.py       # 钓点智能指数
│       ├── friendlinks.py   # 友链管理
│       ├── llm.py           # LLM 模块 (文章总结/AI 对话)
│       ├── public.py        # WebSocket 实时访客
│       ├── subscriptions.py # 订阅管理
│       ├── system.py        # 系统探活 (/system/, /system/log)
│       ├── weather.py       # 天气数据
│       └── weread.py        # 微信读书
├── core/                     # 核心配置 (config, security, exceptions, response, AI Agent)
├── models/
│   ├── models.py            # SQLAlchemy 关系模型 (User, Profile, Subscription, Device, etc.)
│   ├── beanie.py            # MongoDB 文档基础模型
│   ├── blog.py              # 博客模型 (Post)
│   ├── changelog.py         # 更新日志模型 (Changelog)
│   ├── devtask.py           # 开发任务模型 (DevTask)
│   ├── fishing.py           # 钓鱼模型 (FishingRecord, FishingModelMeta)
│   ├── friendlink.py        # 友链模型 (FriendLinks)
│   ├── log.py               # 日志持久化模型
│   ├── moment.py            # 碎碎念模型 (Moment)
│   ├── rss.py              # RSS 文章模型 (RssArticle)
│   ├── subscription.py      # 订阅日志模型 (SubscriptionLog)
│   └── weread/              # 微信读书子包 (WereadBook, UserBook, Archive)
├── repositories/             # 数据访问层 (按职责拆分)
│   ├── user/                # 用户仓储子包
│   └── weread/              # 微信读书仓储子包
├── schemas/                  # Pydantic schemas (按领域拆分)
├── services/                 # 业务逻辑层
│   ├── user/                # 用户认证子包 (UserService, GitHubAuth, Passkey)
│   ├── weread/              # 微信读书子包 (Shelf, Stats)
│   ├── fishing/             # 钓鱼子包 (ExpertScorer, ModelService)
│   └── system/              # 系统子包
├── tasks/                    # Taskiq 异步任务
│   ├── aps_tasks.py         # 定时任务 (RSS 刷新、数据迁移)
│   ├── broker.py            # RabbitMQ 任务代理
│   ├── feishu_task.py       # 飞书通知
│   ├── maintain_task.py     # 维护任务
│   ├── scheduler.py         # 任务调度器
│   ├── task.py              # 异步任务 (邮件、缓存、日志)
│   └── weread_task.py       # 微信读书导入
├── plugins/                  # 缓存与通知插件
│   ├── cache/               # Redis 缓存模块 (@redis_cache)
│   └── notification/        # 多渠道通知模块
├── utils/                    # 工具函数
├── middleware.py             # 中间件注册
├── router.py                # 路由注册
└── main.py                   # FastAPI 入口

go-backend/                     # Go 后端（Gin，路由 /api/v3/*）
├── cmd/server/                # 入口
├── internal/
│   ├── app/                   # AppState 依赖注入容器
│   ├── config/                # 配置加载（env vars）
│   ├── db/                    # PostgreSQL 连接
│   ├── mongo/                 # MongoDB 连接
│   ├── logger/                # slog 初始化（双文件 + trace_id）
│   ├── middleware/            # CORS / 限流 / access log / admin
│   ├── router/                # 路由注册
│   ├── handler/               # HTTP handlers（auth/blog/admin/passkey/github）
│   ├── service/               # 业务逻辑层
│   ├── repository/            # 数据访问层
│   ├── model/                 # 数据模型
│   ├── dto/                   # 请求/响应 DTO
│   ├── response/              # 统一响应封装
│   └── errs/                  # 错误处理
├── configs/                   # 配置文件
├── logs/                      # 日志输出目录
├── Dockerfile                 # 多阶段构建（golang-alpine → alpine）
└── go.mod

frontend/src/
├── api/                      # API Gateway 层 (按领域拆分，直接调用后端)
│   ├── blog/                 # 博客 API
│   ├── fishing/              # 钓鱼 API
│   ├── moments/              # 碎碎念 API
│   ├── public/               # 公共接口 API
│   ├── rss/                  # RSS API
│   ├── devtask/              # 开发任务 v3 API
│   ├── shared/               # 共享请求封装
│   └── weread/               # 微信读书 API
├── assets/                   # 静态资源 (CSS、图片、Lottie 动画)
├── auth/                     # 认证逻辑 (sideEffects)
├── components/
│   ├── ai/                   # AI 天气分析组件
│   ├── article/              # 文章组件
│   ├── basic/                # 基础组件 (布局、导航、地图容器)
│   ├── bento/                # Bento 网格卡片组件
│   ├── blog/                 # 博客组件 (Twikoo 评论)
│   ├── books/                # 书籍组件
│   ├── editor/               # Markdown 编辑器 (ProseMirror)
│   ├── friendlink/           # 友链申请表单
│   ├── icons/                # 图标组件
│   ├── layout/               # 布局组件 (背景切换、主题、Cookie 同意、liquid-glass 导航)
│   ├── map/                  # 天气/潮汐可视化组件
│   ├── moments/              # 碎碎念组件 (卡片/详情/编辑)
│   ├── message/              # 留言板/评论管理组件
│   ├── nav/                  # 导航组件
│   └── ui/                   # shadcn-vue UI 组件
├── composables/              # Vue 组合式函数 (按域分目录)
│   ├── article/              # 文章 composables
│   ├── card/                 # 卡片 composables
│   ├── comment/              # 评论 composables
│   ├── pic/                  # 图库 composables
│   ├── rss/                  # RSS composables
│   ├── shared/               # 共享 composables
│   ├── todo/                 # 开发任务 composables (drawer state)
│   └── weread/               # 微信读书 composables
├── data/                     # 静态数据
├── layouts/                  # 布局组件
├── lib/                      # 第三方库封装
├── plugins/                  # Vue 插件
├── router/                   # Vue Router 配置
├── stores/                   # Pinia 状态管理
│   ├── auth.ts               # 认证状态
│   ├── background.ts         # 背景图状态
│   ├── cardLayout.ts         # Bento 卡片布局状态
│   ├── counter.ts            # 计数器
│   ├── fishingMap.ts         # 钓鱼地图状态
│   ├── moments.ts            # 碎碎念状态
│   ├── notification.ts       # 通知状态
│   ├── readStats.ts          # 阅读统计状态
│   ├── theme.ts              # 主题状态
│   ├── tidePanel.ts          # 潮汐面板状态
│   ├── v3devtasks.ts         # 开发任务 v3 状态 (workspace store)
│   └── visitorCount.ts       # 访客计数状态
├── types/                    # TypeScript 类型定义
├── utils/                    # 工具函数
└── views/                    # 页面组件
    ├── analytics/            # 后台分析 (访客/服务器监控)
    ├── auth/                 # 认证页面 (登录/注册/设置)
    ├── blog/                 # 博客页面 (列表/文章/编辑器)
    ├── books/                # 微信读书 (书架/统计/导入)
    ├── dev/                  # 开发演示页面 (BookDetailDemo)
    ├── device/               # 设备管理 (资产跟踪/成本分析)
    ├── entry/                # Bento 首页 (可拖拽卡片)
    ├── fishing/              # 钓鱼地图 (指数/反馈/天气)
    ├── messages/             # 留言/评论管理
    ├── moments/              # 碎碎念页面
    ├── pages/                # 静态页面 (关于/友链/状态/隐私/更新日志)
    ├── pic/                  # 图库管理 (瀑布流)
    ├── rss/                  # RSS 阅读器
    ├── subscription/         # 订阅管理 (费用/提醒)
    ├── todos/                # 开发任务工作台 (推进/规划/回顾)
    └── toolbox/              # 图片工具箱 (压缩/格式转换)

react-app/src/
├── api/                      # API 请求封装 (request, csrf, refresh, momentsGateway)
├── auth/                     # 认证逻辑 (hydrate, tokenService, heartbeat)
├── assets/                   # 静态资源 (CSS, Lottie 动画)
├── components/
│   ├── basic/                # 基础组件 (布局、导航、Cookie 同意、设置)
│   ├── bento/                # Bento 卡片组件
│   ├── blog/                 # Twikoo 评论组件
│   └── books/                # 书籍组件
├── hooks/                    # 自定义 Hooks
│   │   ├── useArticleChat.ts    # AI 文章对话
│   │   ├── useArticleSummary.ts # AI 文章总结
│   │   ├── useClickOutside.ts  # 点击外部检测
│   │   ├── useOrigin.ts        # 来源追踪
│   │   ├── useShimmerTips.ts   # 骨架屏提示
│   │   ├── useSseStream.ts     # SSE 流式响应
│   │   ├── useTwikoo.ts        # Twikoo 评论
│   │   └── useWebsocket.ts     # WebSocket 连接
├── router/                   # React Router 配置
├── services/                 # 服务层 (按模块分目录)
│   ├── blogService/          # 博客服务
│   ├── galleryService/       # 图库服务
│   ├── momentsService/       # 碎碎念服务
│   ├── rssService/           # RSS 服务
│   ├── todoService/          # 待办服务
│   └── wereadService/        # 微信读书服务
├── stores/                   # Zustand 状态管理
│   ├── authState.ts          # 认证状态
│   ├── deviceState.ts        # 设备状态 (isMobile)
│   ├── fishingMapStore.ts    # 钓鱼地图状态
│   ├── momentsState.ts       # 碎碎念状态
│   ├── notificationState.ts  # 通知状态
│   ├── readStatsStore.ts     # 阅读统计状态
│   ├── routeMapStore.ts      # 路由映射状态
│   ├── themeState.ts         # 主题状态
│   ├── todoState.ts          # 待办状态
│   └── visitorCountStore.ts  # 访客计数状态
├── types/                    # TypeScript 类型定义
├── utils/                    # 工具函数 (formatdate, imageCompressor, visitorTracker)
├── views/                    # 页面组件 (移动端优先)
│   ├── Auth/                 # 认证页面 (登录/注册/设置)
│   ├── Blog/                 # 博客页面 (列表/文章)
│   ├── BookShelf/            # 微信读书 (书架/统计)
│   ├── device/               # 设备管理 (资产跟踪/成本分析)
│   ├── FishingMap/           # 钓鱼地图 (AI 天气分析/潮汐/指数)
│   ├── Home/                 # Bento 首页
│   ├── Moments/              # 碎碎念页面
│   ├── NotFound/             # 404 页面
│   ├── pages/                # 静态页面 (友链/状态)
│   ├── Pic/                  # 图库管理
│   ├── Rss/                  # RSS 阅读器
│   ├── subscription/         # 订阅管理 (费用/提醒)
│   ├── Todo/                 # 开发任务看板
│   ├── Toolbox/              # 图片工具箱
│   ├── Website/              # 网站目录
│   └── general/              # 通用页面
├── App.tsx                   # React 应用组件
└── main.tsx                  # React 渲染入口
```

## 架构设计

### 总体架构（前后端分离 + 移动端自动分流）

- **Frontend (Vue 3 + TypeScript)**：桌面端 SPA，负责页面渲染、交互状态管理、路由与鉴权守卫。
- **React App (React 19 + TypeScript)**：移动端 SPA，针对移动设备优化，提供触控友好的界面。
- **Backend**：Python FastAPI（`/api/v1` + `/api/v2`，业务编排、定时任务）+ Go Gin（`/api/v3`，认证/Blog/Admin，逐步迁移中）。
- **Data Layer**：PostgreSQL（核心业务数据）+ MongoDB（文档型数据）+ Redis（缓存/会话）+ RabbitMQ（异步队列）。

```mermaid
flowchart LR
    U[User Browser] --> D{Mobile?}
    D -->|Yes| R[React App\nm.kanocifer.chat]
    D -->|No| F[Vue App\nkanocifer.chat]
    F -->|HTTP / SameSite Cookie| B[Backend API]
    R -->|HTTP / SameSite Cookie| B
    B -->|/api/v1,/api/v2| P[Python\nFastAPI]
    B -->|/api/v3| G[Gin\ngo-backend]
    P --> PG[(PostgreSQL)]
    P --> MG[(MongoDB)]
    P --> RD[(Redis)]
    P --> RMQ[(RabbitMQ)]
    P --> TQ[Taskiq Worker]
    G --> PG
    G --> MG
    G --> RD
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

#### Python (FastAPI, `/api/v1` + `/api/v2`)

- **API 层 (`api/v1`, `api/v2`)**：参数校验、鉴权、响应封装，不承载复杂业务。
- **Service 层 (`services`)**：核心业务逻辑，组合仓储与外部依赖。
- **Repository 层 (`repositories`)**：数据访问抽象，隔离 SQL/ORM 查询细节。
- **Schema 层 (`schemas`)**：请求/响应模型定义，保证输入输出契约稳定。
- **Core/Tasks 层 (`core`, `tasks`)**：配置、日志、异常处理、异步任务与定时任务。

#### Go (Gin, `/api/v3`)

- **Router (`internal/router`)**：集中注册所有业务路由，前缀 `/api/v3`。
- **Handler (`internal/handler`)**：HTTP 请求处理，参数绑定 + 调用 service。
- **Service (`internal/service`)**：核心业务逻辑。
- **Repository (`internal/repository`)**：数据访问层。
- **AppState (`internal/app`)**：依赖注入容器，管理 DB/Redis/Mongo 连接。
- **Middleware (`internal/middleware`)**：CORS、限流、access log、admin 鉴权。
- **Logger (`internal/logger`)**：slog 初始化（双文件路由 + trace_id + lumberjack）。

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
2. **类型优先**：前端 TypeScript + 后端 Pydantic，减少接口漂移；双端 schemas 与后端同步维护。
3. **安全默认**：JWT + SameSite Cookie + WebAuthn/Passkey + 输入校验（CSRF 已由 SameSite + 双重 Cookie 替代）。
4. **异步扩展**：Taskiq + RabbitMQ/Redis 支撑耗时任务、定时任务与日志异步落库。
5. **可维护性**：统一 lint/format/type-check/test 流程，Ruff (79字符) + Oxlint + Prettier。
6. **品牌一致**：设计系统（DESIGN.md）+ 主题 package 跨双端共享，4 套配色方案。

## API 端点 (:5555)

| 路由                    | 描述                                    |
| ----------------------- | --------------------------------------- |
| `/api/v1/auth`          | 认证 (登录/注册/Passkey/OAuth/用户资料) |
| `/api/v1/blog`          | 博客系统 (文章/评论/分类)               |
| `/api/v1/moments`       | 碎碎念 (动态 CRUD)                      |
| `/api/v1/rss`           | RSS 订阅器 (订阅/文章/刷新)             |
| `/api/v1/publish`       | 发布接口                                |
| `/api/v1/messages`      | 留言板                                  |
| `/api/v1/admin`         | 管理员 (内容审核/分析/自动部署)         |
| `/api/v1/status`        | 系统监控 (访客分析/登录日志/服务器状态) |
| `/api/v1/public`        | 公共接口 (状态/点赞/SEO/天气分析/图库)  |
| `/api/v2/llm`           | LLM 模块 (文章总结/AI 对话/模型选择)    |
| `/api/v2/weread`        | 微信读书 (书架同步/阅读统计/进度)       |
| `/api/v2/fishing`       | 钓点智能指数 (计算/反馈/统计/模型权重)  |
| `/api/v2/subscriptions` | 订阅管理 (CRUD/提醒配置/到期检测)       |
| `/api/v2/device`        | 设备管理 (CRUD/里程碑/提醒)             |
| `/api/v2/weather`       | 天气数据 (潮汐/完整天气)                |
| `/api/v2/friend-links`  | 友链管理 (CRUD/排序)                    |
| `/api/v2/system`        | 系统探活与日志 (/, /log)                |
| `/api/v2/publicv2/ws`   | WebSocket 实时访客统计                  |
| `/api/v3/auth`          | Go 后端认证 (登录/注册/Passkey/OAuth)   |
| `/api/v3/blog`          | Go 后端博客只读接口                     |
| `/api/v3/admin`         | Go 后端管理接口                         |
| `/api/v3/dev-tasks`     | 开发任务工作台 (CRUD/排序/依赖/归档)    |
| `/api/v3/system/events` | Go 后端事件日志查询                     |

## 最近改动（v4.1.0 – v4.6.0）

| 版本       | 日期  | 主要变更                                                                                       |
| ---------- | ----- | ---------------------------------------------------------------------------------------------- |
| **v4.6.0** | 07-13 | 开发任务 v2→v3 迁移：三视角工作台（推进/规划/回顾）、全局抽屉、spec/依赖字段，删除废弃 v2 栈 |
| **v4.5.0** | 07-11 | DI 依赖注入改造（AppState + session 参数化）、slog access log 中间件、部署/飞书修复            |
| **v4.4.0** | 07-10 | CORS 官方中间件替换、Blog 只读接口迁移 Go、启动飞书通知、duration middleware                   |
| **v4.3.0** | 07-08 | slog 结构化日志体系落地（双文件路由 + trace_id + lumberjack）、event 表替代 access.log         |
| **v4.2.0** | 07-06 | 通知渠道扩展（Bark/飞书/邮件验证码）、Docker 支持、构造函数配置注入                            |
| **v4.1.0** | 07-05 | 认证系统迁移 Go 后端（登录/注册/限流）、GitHub OAuth 绑定解绑、Redis refresh rotation + bcrypt |

> 完整历史见 `/api/v2/changelog` 接口或前端「更新日志」页面。

## 定时任务

| 任务                      | 调度规则                   | 功能                                           |
| ------------------------- | -------------------------- | ---------------------------------------------- |
| `refresh_rss_feeds`       | 每天 10:00 (Asia/Shanghai) | 刷新所有 RSS 订阅源，飞书推送刷新统计          |
| `run_migration_job`       | 每 1 小时                  | 批量迁移 Redis 访客数据到 PostgreSQL           |
| `send_daily_summary`      | 每天 08:00                 | 昨日访客分析日报（Top 页面/浏览器/OS）飞书推送 |
| `send_todo`               | 每天 09:00                 | 未完成待办提醒飞书推送                         |
| `subscription_check_task` | 每 4 小时                  | 订阅到期提醒（30/7/3/1 天前 + 当天）           |
| `check_device_milestones` | 按需触发                   | 设备里程碑通知（100 天/1 年等）                |

## 环境变量

### 必填

| 变量           | 说明                               | 示例                                              |
| -------------- | ---------------------------------- | ------------------------------------------------- |
| `SECRET_KEY`   | JWT 签名密钥                       | `openssl rand -hex 32` 生成                       |
| `DATABASE_URL` | PostgreSQL 异步连接串              | `postgresql+asyncpg://user:pass@localhost/dbname` |
| `MONGO_URI`    | MongoDB 连接串                     | `mongodb://localhost:27017/`                      |
| `REDIS_URL`    | Redis 连接串                       | `redis://localhost:6379/0`                        |
| `RABBITMQ_URL` | RabbitMQ 连接串（Taskiq 任务队列） | `amqp://guest:guest@localhost:5672/`              |

### 认证 & 安全

| 变量                   | 说明                            | 默认值                                              |
| ---------------------- | ------------------------------- | --------------------------------------------------- |
| `WEBAUTHN_RP_ID`       | WebAuthn Relying Party ID       | `kanocifer.chat`                                    |
| `WEBAUTHN_ORIGIN`      | WebAuthn Origin                 | `https://kanocifer.chat`                            |
| `GITHUB_CLIENT_ID`     | GitHub OAuth App Client ID      | —                                                   |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret  | —                                                   |
| `GITHUB_REDIRECT_URI`  | GitHub OAuth 回调地址           | `http://localhost:5555/api/v1/auth/github/callback` |
| `JWT_PRIVATE_KEY`      | 自定义 JWT 私钥（可选）         | —                                                   |
| `COOKIE_DOMAIN`        | Cookie 跨域域名（生产环境设置） | —                                                   |
| `SAME_SITE_COOKIE`     | Cookie SameSite 策略            | `lax`                                               |

### 邮件 & 通知

| 变量                 | 说明                               | 默认值 |
| -------------------- | ---------------------------------- | ------ |
| `MAIL_USERNAME`      | 邮件发送账号                       | —      |
| `MAIL_PASSWORD`      | 邮件发送密码                       | —      |
| `ADMIN_EMAIL`        | 管理员邮箱（接收通知）             | —      |
| `FEISHU_WEBHOOK_URL` | 飞书 Webhook 地址（任务提醒/日报） | —      |
| `SEND_BOOT_EMAIL`    | 启动时是否发送通知邮件             | `True` |

### AI & 第三方服务

| 变量                       | 说明                                   | 默认值                      |
| -------------------------- | -------------------------------------- | --------------------------- |
| `API_KEY`                  | AI 服务 API Key（文章总结/对话）       | —                           |
| `AMAP_SECURITY_CODE`       | 高德地图安全密钥                       | —                           |
| `AMAP_WEB_KEY`             | 高德地图 Web 服务 Key                  | —                           |
| `AMAP_KEY_ALLOWED_ORIGINS` | 允许获取高德密钥的前端来源（逗号分隔） | `http://localhost:5173,...` |
| `QWEATHER_BASE_URL`        | 和风天气 API 基础地址                  | —                           |
| `VITE_JS_API_TOKEN`        | 前端 API Token                         | —                           |

### 运维 & 调试

| 变量                    | 说明                                              | 默认值                                            |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `REDIS_MAX_CONNECTIONS` | Redis 连接池最大连接数                            | `50`                                              |
| `ENABLE_TRACKING`       | 是否启用访客追踪                                  | `True`                                            |
| `SAVE_LOGS`             | 是否保存日志                                      | `True`                                            |
| `ADMIN_USER_IDS`        | 管理员用户 ID 列表                                | `[1, 2]`                                          |
| `GITEE_WEBHOOK_SECRET`  | Gitee 自动部署 Webhook 密钥                       | —                                                 |
| `FRONTEND_URL`          | 前端地址（CORS/重定向）                           | `https://kanocifer.chat`                          |
| `DB_MIGRATE_URL`        | 数据库迁移用同步连接串（Alembic，**非 asyncpg**） | `postgresql+psycopg://user:pass@localhost/dbname` |
| `LOG_RETENTION_DAYS`    | 日志保留天数                                      | `30`                                              |

## 更多信息（快速开始 & 代码风格）

| 文档                         | 内容                                  |
| ---------------------------- | ------------------------------------- |
| `docs/rules/architecture.md` | 后端分层、数据层、API 约定、双端分流  |
| `docs/rules/commands.md`     | 常用命令速查                          |
| `docs/rules/code-style.md`   | 后端 / Vue / React 代码风格           |
| `docs/rules/environment.md`  | 环境变量、端口、工具链版本            |
| `docs/rules/auth.md`         | 双后端认证统一契约                    |
| `docs/rules/go-backend.md`   | Go 重构分层、鉴权差异、测试、已知遗留 |
| `docs/rules/testing.md`      | 前端测试规范                          |

## License

MIT
