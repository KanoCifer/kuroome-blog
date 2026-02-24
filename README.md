# ReadingList-Flask

[![Python](https://img.shields.io/badge/Python-v3.14%2B-3776AB?logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-v3.x-000000?logo=flask)](https://flask.palletsprojects.com/)
[![Vue](https://img.shields.io/badge/Vue-v3.5-42b883?logo=vue.js)](https://vuejs.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-v2.0+-D71F00)](https://www.sqlalchemy.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-ES2024-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?logo=playwright)](https://playwright.dev/)

基于 **Flask 3.x + Vue 3 + SQLAlchemy 2.0** 的全栈阅读清单管理项目，包含用户认证、书籍管理、博客系统、数据迁移与 Playwright E2E 测试。

## 项目概述

- **架构**: 完整的 SPA 应用（Vue 3 前端 + Flask API 后端）
- **后端**: Flask 3.x (APIFlask)、SQLAlchemy 2.0、Python 3.14+、SQLite3 (开发)、PostgreSQL (生产)、Flask-PyMongo (MongoDB 用于留言板和博客)
- **前端**: Vue 3.5、TypeScript、Vite、Tailwind CSS v4、Pinia、Vue Router
- **测试**: Pytest (后端)、Vitest (前端)、Playwright (E2E)

## 技术栈

### 后端
- **Flask 3.x (APIFlask)**: API 优先的 Flask 框架
- **SQLAlchemy 2.0**: 类型安全的 ORM
- **Flask-Migrate**: 数据库迁移
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
# 后端 (:5050) - 终端 1
cd backend && python dev.py
# 前端 (:5173) - 终端 2
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
python dev.py           # Flask API on :5050
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
# 需要后端 (:5050) 和前端 (:5173) 同时运行
npx playwright test
npx playwright test tests/example.spec.ts   # 单个文件
npx playwright test --headed                 # 可视化模式
npx playwright test --debug                  # 调试模式
```

## 项目结构

```
├── backend/
│   ├── watchlist/         # Flask 应用包
│   │   ├── api/           # RESTful API 路由
│   │   ├── models.py      # SQLAlchemy 2.0 模型
│   │   └── templates/     # 遗留 Jinja2 模板
│   ├── migrations/        # Alembic 迁移
│   ├── dev.py             # 开发入口 (:5050)
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
- Flask API 模式
- Flask-PyMongo (MongoDB) 模式
- Vue 3 / TypeScript 规范
- 测试模式与 Fixtures

## License

MIT
