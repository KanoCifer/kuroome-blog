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
tests/                 # 测试套件 (Pytest + Vitest + Playwright)
```

## 命令

### 后端

```bash
cd backend
ruff format . && ruff check .          # 格式化 + 检查
ruff check . --fix                     # 自动修复可修复的问题
alembic revision --autogenerate -m "x"  # 迁移
alembic upgrade head                    # 执行迁移
alembic downgrade -1                    # 回滚上一个迁移
python dev.py                           # 启动 (:5555)
python -m pytest                        # 运行所有后端测试
python -m pytest tests/test_comment_fix.py -v  # 运行单个测试文件
python -m pytest tests/test_comment_fix.py::test_get_comment_tree_logic -v  # 运行单个测试函数
```

### 前端

```bash
cd frontend
npm run dev                             # 启动 (:5173)
npm run build                           # 构建
npm run format                          # Prettier 格式化
npm run lint:oxlint                     # Oxlint 检查 + 自动修复
npm run lint:eslint                     # ESLint 检查 + 自动修复
npm run lint                            # 运行所有 lint 检查
npm run test:unit                       # 运行所有前端单元测试 (Vitest)
npx vitest run tests/example.spec.ts    # 运行单个测试文件
npx vitest run tests/example.spec.ts --test-name="test name"  # 运行匹配名称的测试
npx playwright test                     # 运行所有 E2E 测试
npx playwright test --headed            # 有界面模式运行 E2E
npx playwright test example.spec.ts     # 运行单个 E2E 测试文件
```

## 代码风格

### 后端 (Python)

- **Ruff**: 79字符行宽, 4空格, 双引号
- **导入顺序**: future → stdlib → third-party → first-party → local-folder
- ** Ruff 规则**: E/W/F/I/N/UP/B/C4/DTZ/SIM/TID/PTH/RUF
- **类型注解**: 使用 Python 3.14+ 语法（如 `list[str]` 而非 `List[str]`）
- **命名 convention**:
  - 函数/变量: snake_case
  - 常量: UPPER_SNAKE_CASE
  - 类: PascalCase
  - 私有成员: _leading_underscore
- **禁止**: `as any`, `@ts-ignore`, `@ts-expect-error`, 空 catch 块
- **文档字符串**: 使用 Google 风格或 NumPy 风格
- **异常处理**: 捕获特定异常而非裸 `except:`

### 前端 (Vue/TS)

- **Prettier**: 4空格, Tailwind CSS 插件
- **ESLint + Oxlint**: 推荐规则集
- **TypeScript**: 严格模式 (`strict: true`)
- **Vue 3 Composition API**: `<script setup>`
- **命名 convention**:
  - 函数/变量: camelCase
  - 组件: PascalCase
  - 常量: UPPER_SNAKE_CASE
  - 类型/接口: PascalCase
  - 枚举: PascalCase
- **文件组件**:
  - 单文件组件 (.vue): 使用 `<script setup lang="ts">`
  - 模板: 使用 PascalCase 组件标签或 kebab-case 原生元素
  - 脚本: 使用 Composition API, 避免 Options API
- **样式**: 使用 Tailwind CSS utility classes, 避免自定义 CSS 除非必要
- **类型断言**: 优先使用类型断言函数而非 `as Type` 或 `<Type>`
- **异步处理**: 使用 `async/await`, 避裸 `.then()` 链
- **错误处理**: 使用 try/catch 或 Vue 全局错误处理器

## 错误处理

- **后端**: 
  - Pydantic 模型验证
  - 自定义异常类继承自 `HTTPException`
  - FastAPI 全局异常处理器
  - 日志记录而非 `print()`
- **前端**:
  - Vue 错误边界 (`errorCaptured`)
  - Axios 响应拦截器统一处理 HTTP 错误
  - 错误提示使用抗扰动 UI 组件 (如 Ant Design Notification)
  - 开发环境使用 `console.error`, 生产环境上传错误监控

## 关键位置

| 任务    | 路径                          |
| ------- | ----------------------------- |
| API     | `backend/app/routers/`        |
| 模型    | `backend/app/models/`         |
| 模式    | `backend/app/schemas/`        |
| Vue组件 | `frontend/src/components/`    |
| 页面    | `frontend/src/views/`         |
| 状态管理| `frontend/src/stores/`        |
| 路由    | `frontend/src/router/`        |
| 认证    | `backend/app/routers/auth.py` |
| 数据库  | `backend/app/models/` + `migrations/` |
| 缓存    | Redis 通过 `backend/app/dependencies/` 注入 |

## 测试指南

### 后端测试 (Pytest)

- 测试文件命名: `test_*.py` 或 `*_test.py`
- 测试函数命名: `test_*`
- 夹具 (fixtures): 放在 `tests/conftest.py` 或测试文件开头
- 模拟数据: 使用 factory-boy 或手动创建模拟对象
- 数据库测试: 使用 SQLite 内存数据库
- 断言: 使用 pytest 原生 assert 或 pytest-插件增强的断言
- 覆盖率: `pytest --cov=app --cov-report=term-missing`

### 前端单元测试 (Vitest)

- 测试文件命名: `*.spec.ts` 或 `*.test.ts`
- 测试位置: 与源文件并列或在 `__tests__` 目录中
- 断言库: Vitest 内置 expect 或引入 @vitest/ui
- 模拟: 使用 `vi.mock()` 或 `vitest.mock()`
- 组件测试: 使用 Vue Test Utils + Vitest
- 快照测试: 适用于纯函数输出或稳定 UI

### E2E 测试 (Playwright)

- 测试文件命名: `*.spec.ts`
- 位置: `tests/` 目录根部
- 页面对象模式: 建议使用
- 测试数据: 使用测试专用账号或临时数据
- 等待策略: 优先使用 `waitFor*` 而非 `waitForTimeout`
- 视觉测试: 使用 `toHaveScreenshot()` (需基线图)
- 认证: 在 `tests/example.spec.ts` 中查看登录模式

## 提交规则

1. 不修改 `node_modules/`, `.venv/`, `__pycache__/`
2. 后端编辑后: `ruff format . && ruff check .`
3. 前端编辑后: `npm run format && npm run lint`
4. 不提交 `.env`, `node_modules/`, `.venv/`, 临时文件
5. 提交前运行相关测确保不破坏现有功能
6. 提交信息遵循 Conventional Commits:
   - `feat:` 新功能
   - `fix:` 错误修复
   - `docs:` 文档变更
   - `style:` 格式化 (不影响代码运行)
   - `refactor:` 重构 (不添加功能, 不修复错误)
   - `perf:` 性能改进
   - `test:` 添加或修改测试
   - `chore:` 构建过程或辅助工具的变更
7. 分支命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`

## 常见问题排查

### 后端
- **模型迁移问题**: 检查 Alembic 版本历史, 确保没有跳过迁移
- **依赖冲突**: 使用 `pip check` 验证, 考虑使用 poetry 或 pdm
- **数据库连接**: 验证 `.env` 配置, 检查连接池耗尽
- **内存泄漏**: 使用 `objgraph` 或 `memory_profiler` 分析

### 前端
- **样式不生效**: 检查 Tailwind 配置, 确保使用了正确的类名
- **状态不同步**: 检查 Pinia store 的 action 是否正确修改 state
- **路由问题**: 检查 router/index.ts 的路由定义和导航守卫
- **性能问题**: 使用 Chrome DevTools 性能面板, 检查不必要的重渲染

## 参考文档

- FastAPI 官方文档: https://fastapi.tiangolo.com/
- Vue 3 官方文档: https://vuejs.org/
- Tailwind CSS v4 文档: https://tailwindcss.com/
- Vitest 文档: https://vitest.dev/
- Playwright 文档: https://playwright.dev/
- SQLAlchemy 2.0 文档: https://docs.sqlalchemy.org/
- Pinia 文档: https://pinia.vuejs.org/