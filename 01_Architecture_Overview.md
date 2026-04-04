# ReadingList 架构总览

## 1. 项目概述

ReadingList 是一个基于 **FastAPI + Vue 3** 的全栈阅读清单与博客系统，用于管理书籍、博客、RSS 订阅、留言互动、微信读书导入及后台监控等能力。

系统采用前后端分离架构：前端负责交互与展示，后端负责统一 API、业务编排、权限控制、异步任务与多数据库持久化。

## 2. 技术栈清单

- **后端框架**：FastAPI
- **ORM / 数据访问**：SQLAlchemy 2.0
- **文档数据库**：MongoDB + Beanie
- **缓存 / 队列**：Redis
- **异步任务**：Taskiq
- **关系数据库**：PostgreSQL
- **前端**：Vue 3 + TypeScript + Vite
- **样式**：Tailwind CSS v4
- **状态管理**：Pinia
- **接口风格**：RESTful API
- **认证**：JWT / Cookie / CSRF / Passkey

## 3. 目录结构说明

后端核心目录如下：

```text
app/
├── api/           # API 路由层，按版本与业务域拆分
├── models/        # 数据模型定义（SQLAlchemy / Beanie）
├── schemas/       # Pydantic 请求与响应模型
├── services/      # 业务逻辑层
├── repositories/  # 数据访问层
├── core/          # 配置、日志、通用基础设施
├── tasks/         # Taskiq 异步任务与调度相关代码
└── utils/         # 通用工具函数
```

常见职责划分：

- `app/api`：接收请求、参数校验、权限依赖、返回统一响应
- `app/models`：定义数据库实体与字段关系
- `app/services`：组合仓储、缓存、外部服务，承载核心业务
- `app/repositories`：封装 SQL / Mongo 查询细节，避免路由层直连数据库

## 4. 核心请求链路图

```text
浏览器 / App
   │
   ▼
Vue3 页面 / Pinia / Router
   │
   ▼
HTTP 请求（Cookie / JWT / CSRF）
   │
   ▼
FastAPI 路由 app/api
   │
   ├── 参数校验 / 鉴权 / 响应封装
   ▼
Service 业务层 app/services
   │
   ├── 缓存读写（Redis）
   ├── 异步任务投递（Taskiq）
   ▼
Repository 数据层 app/repositories
   │
   ├── PostgreSQL（SQLAlchemy）
   └── MongoDB（Beanie）
```

## 5. 应用启动流程

1. 加载环境变量与配置项
2. 初始化日志、数据库连接、Redis、MongoDB
3. 注册 FastAPI 中间件、依赖项和路由
4. 启动前执行数据库迁移与基础数据检查
5. 启动 Web 服务，暴露 `/api/v1` 接口
6. 若启用 Taskiq，则同时启动 worker / scheduler 处理后台任务

## 6. API 路由概览

| 路由 | 说明 |
| --- | --- |
| `/api/v1/auth` | 登录、注册、Passkey、OAuth 等认证能力 |
| `/api/v1/users` | 用户资料、头像、账户信息 |
| `/api/v1/books` | 书籍管理、阅读进度、书架数据 |
| `/api/v1/blog` | 博客文章、分类、评论 |
| `/api/v1/messages` | 留言板 |
| `/api/v1/weread` | 微信读书导入与同步 |
| `/api/v1/rss` | RSS 订阅、抓取、文章聚合 |
| `/api/v1/admin` | 管理员审核与后台管理 |
| `/api/v1/ai` | AI 摘要、对话、内容增强 |
| `/api/v1/todos` | 待办事项 |
| `/api/v1/monitor` | 系统监控与运行指标 |
| `/api/v1/public` | 公开 API 能力 |
