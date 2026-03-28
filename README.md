# ReadingList

[![Python](https://img.shields.io/badge/Python-v3.14%2B-3776AB?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-NEW-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vue](https://img.shields.io/badge/Vue-v3.5-42b883?logo=vue.js)](https://vuejs.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-v2.0-D71F00)](https://www.sqlalchemy.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2024-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18+-336791?logo=postgresql)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0-d82c20?logo=redis)](https://redis.io/)
[![Pinia](https://img.shields.io/badge/Pinia-2.0-7b3fe4?logo=pinia)](https://pinia.vuejs.org/)

基于 **FastAPI + Vue 3** 的全栈阅读清单管理与个人博客系统。

## 功能特性

| 功能模块       | 描述                                  |
| -------------- | ------------------------------------- |
| **用户系统**   | 注册、登录、个人资料、JWT/Cookie 认证 |
| **书籍管理**   | 书籍 CRUD、书架展示、阅读进度追踪     |
| **微信读书**   | 从微信读书导入书籍                    |
| **博客系统**   | 文章发布、分类、标签、评论            |
| **留言板**     | 访客留言、管理                        |
| **RSS 阅读器** | RSS 订阅解析、文章聚合                |
| **AI 助手**    | 文章总结（Redis 缓存）                |
| **后台监控**   | 系统运行数据监控                      |

## 技术栈

- **后端**: FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL + MongoDB (Beanie) + Redis
- **前端**: Vue 3.5 + TypeScript + Vite + Tailwind CSS v4 + Pinia + shadcn-vue + motion-v
- **AI**: Agno (Langchain 替代方案)
- **安全**: JWT 认证、CSRF 保护、输入验证

## 快速开始

```bash
# 1. 后端环境
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt  # 或 pip install -e .

# 2. 配置环境变量
cp .env.example .env  # 编辑 .env 配置数据库等

# 3. 数据库迁移
alembic upgrade head

# 4. 启动开发服务器
python dev.py           # 后端 :5555
cd ../frontend && pnpm install && pnpm run dev  # 前端 :5173
```

访问 `http://localhost:5173`

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
python -m pytest tests/test_books.py -v           # 单个测试文件
python -m pytest tests/test_books.py::test_list -v # 单个测试函数
python -m pytest -k "keyword"                     # 按关键字过滤
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
npx playwright test                     # E2E 测试
npx playwright test --headed            # 可视化模式
npx playwright test --debug             # 调试模式
```

## 项目结构

```
backend/app/
├── api/v1/              # API 端点 (auth, books, blog, messages, weread, rss, admin, ai, todos, monitor)
├── models/              # 数据库模型 (SQLAlchemy 2.0 + MongoDB Beanie)
├── schemas/             # Pydantic schemas (按领域拆分)
├── repositories/        # 数据访问层
├── services/            # 业务逻辑层
├── core/                # 配置、日志、AI Agent
├── utils/               # 工具函数
├── tasks/               # Taskiq 异步任务
└── main.py              # FastAPI 入口

frontend/src/
├── views/               # 页面组件 (auth, blog, rss, books, general)
├── components/          # 可复用组件 (ui/, bento/, basic/, icons/, editor/)
├── stores/              # Pinia 状态管理
├── router/              # Vue Router
├── types/               # TypeScript 类型定义
├── lib/                 # 第三方库封装
├── utils/               # 工具函数
├── layouts/             # 布局组件
└── assets/              # 静态资源

tests/                   # Pytest (后端) + Playwright (E2E)
scripts/                 # 工具脚本
```

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

## 配置

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql+psycopg2://user:pass@localhost/readinglist
MONGO_URI=mongodb://localhost:27017/readinglist
REDIS_URL=redis://localhost:6379/0
```

## 代码风格

- **后端**: Ruff (79字符, 4空格, 双引号), Python 3.14+ 类型注解
- **前端**: Prettier + ESLint + Oxlint, Tailwind CSS, `<script setup>`
- **详细规范**: 见 [CLAUDE.md](./CLAUDE.md)

## 提交规范

1. 后端提交前: `cd backend && ruff format . && ruff check .`
2. 前端提交前: `cd frontend && pnpm format && pnpm lint && pnpm type-check`
3. 提交信息: Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`)
4. 分支命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`

## 部署

- **在线演示**: [Kuroome's Blog](https://kanocifer.chat)
- **本地端口**: 后端 `:5555` / 前端 `:5173`

## License

MIT
