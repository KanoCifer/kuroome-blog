---
name: verify
description: 运行所有格式化检查和类型检查，确保代码符合项目规范
---

# Verify Skill

运行项目的所有质量检查：格式化、lint、类型检查。

## 命令

### Frontend (Vue)
```bash
cd frontend && pnpm run format && pnpm run lint && pnpm run type-check
```

### Backend (Python)
```bash
cd backend && ruff format . && ruff check .
```

### React-app
```bash
cd react-app && pnpm run lint && pnpm run type-check
```

## 执行顺序

1. Backend Ruff (format + lint)
2. Frontend (format + lint + type-check)
3. React-app (lint + type-check)

## 何时使用

- 提交代码前
- 完成一个功能模块后
- 收到 lint/类型错误报告后
