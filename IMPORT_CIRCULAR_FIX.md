# 循环导入问题分析与解决方案

## 问题概述

在 FastAPI 项目中遇到了多个循环导入（Circular Import）错误，导致应用无法启动。本文档记录了错误原因、解决方案及预防措施。

## 错误原因分析

### 什么是循环导入？

当两个或多个模块相互导入对方时，Python 无法确定加载顺序，导致 `ImportError`。

典型场景：
```
A.py → 导入 B.py → 导入 A.py (A 还未初始化完成)
```

### 本项目遇到的循环导入链

#### 1. `app/tasks/__init__.py` ↔ `app/tasks/aps_tasks.py`

```
app/tasks/__init__.py
    └── from app.tasks.aps_tasks import refresh_rss_feeds
            └── from app.tasks import broker, send_feishu_message  # 循环！
```

#### 2. `app/core` ↔ `app/api/des`

```
app/core/__init__.py
    └── from app.core.container import ...
            └── from app.api.des import get_async_session
                    └── from app.api.des.csrf import setup_csrf
                            └── from app.core.config import settings  # 循环！
```

#### 3. `app/core/container.py` → `app.services` → `app.tasks` → `app.core.container`

```
app/core/__init__.py
    └── from app.core.container import ...
            └── from app.services import ...
                    └── from app.services.weread_service import WereadService
                            └── from app.tasks import import_books_from_weread
                                    └── from app.tasks.aps_tasks import ...
                                            └── from app.core.container import get_monitor_service  # 循环！
```

## 解决方案

### 原则：直接从子模块导入，避免从包的 `__init__.py` 导入

### 修改前 vs 修改后

#### 示例 1：`app/tasks/aps_tasks.py`

```python
# ❌ 错误：从包导入
from app.tasks import broker, send_feishu_message

# ✅ 正确：从子模块导入
from app.tasks.broker import broker
from app.tasks.feishu_task import send_feishu_message
```

#### 示例 2：`app/core/container.py`

```python
# ❌ 错误：从包导入
from app.api.des import get_async_session
from app.core import ArticleSummarizer, article_summarizer

# ✅ 正确：从子模块导入
from app.api.des.db import get_async_session
from app.core.agent import ArticleSummarizer, article_summarizer
```

#### 示例 3：`app/services/weread_service.py`

```python
# ❌ 错误：从包导入，触发 __init__.py
from app.tasks import import_books_from_weread

# ✅ 正确：从子模块导入
from app.tasks.weread_task import import_books_from_weread
```

#### 示例 4：`app/tasks/aps_tasks.py`（懒加载）

```python
# ❌ 错误：模块级别导入，导致循环
from app.core.container import get_monitor_service, get_rss_service

# ✅ 正确：在函数内部导入（懒加载）
async def refresh_rss_feeds(context: Context = TaskiqDepends()):
    from app.core.container import get_rss_service
    async with get_rss_service(context.state.redis) as rss_service:
        ...
```

## 修复的文件清单

| 文件 | 修改内容 |
|------|----------|
| `app/tasks/aps_tasks.py` | 从 `app.tasks` 改为 `app.tasks.broker`/`app.tasks.feishu_task`；`app.core.container` 导入改为函数内懒加载 |
| `app/tasks/scheduler.py` | 从 `app.tasks` 改为 `app.tasks.broker` |
| `app/tasks/task.py` | 从 `app.core` 改为 `app.core.config`/`app.core.container`/`app.core.logger`/`app.core.mail` |
| `app/tasks/broker.py` | 从 `app.core` 改为 `app.core.config`/`app.core.logger` |
| `app/tasks/feishu_task.py` | 从 `app.core` 改为 `app.core.config`/`app.core.logger` |
| `app/tasks/maintain_task.py` | `app.core.container` 导入改为函数内懒加载 |
| `app/tasks/weread_task.py` | `app.core.container` 导入改为函数内懒加载 |
| `app/services/weread_service.py` | 从 `app.tasks` 改为 `app.tasks.weread_task` |
| `app/core/container.py` | 从 `app.api.des` 改为 `app.api.des.db`；从 `app.core` 改为 `app.core.agent` |

## 如何避免循环导入

### 1. 导入规则

```python
# ✅ 推荐：直接从子模块导入
from app.tasks.broker import broker
from app.core.config import settings
from app.api.des.db import get_async_session

# ❌ 避免：从包的 __init__.py 导入
from app.tasks import broker
from app.core import settings
from app.api.des import get_async_session
```

### 2. 懒加载模式

当模块 A 被多个模块导入，且 A 又需要导入那些模块时：

```python
# ❌ 模块级别导入（可能导致循环）
from app.core.container import get_service

def my_function():
    async with get_service() as service:
        ...

# ✅ 函数内部导入（懒加载）
def my_function():
    from app.core.container import get_service
    async with get_service() as service:
        ...
```

### 3. 依赖方向原则

```
高层模块不应依赖低层模块，两者都应依赖抽象。
```

推荐的依赖层次：
```
app/main.py
    ↓
app/api/des (基础设施层)
    ↓
app/core (核心层)
    ↓
app/services (服务层)
    ↓
app/repositories (数据访问层)
    ↓
app/models (模型层)
```

`app/tasks` 应该：
- 导入 `app.core.config`、`app.core.logger`（工具类）
- 导入 `app.core.container`（仅在函数内部）
- **不被** `app/core` 或 `app/services` 在模块级别导入

### 4. 检查方法

```bash
# 清除 __pycache__ 后重新运行
find . -type d -name __pycache__ -exec rm -rf {} +
python dev.py
```

### 5. 使用工具检测

```bash
# 安装 cyclic imports 检测工具
pip install pydeps

# 生成依赖图
pydeps app --show-cycles
```

## 总结

| 原因 | 解决方案 |
|------|----------|
| 从包的 `__init__.py` 导入触发循环 | 直接从子模块导入 |
| 模块级别的相互依赖 | 使用懒加载（函数内部导入） |
| 依赖层次混乱 | 遵循单向依赖原则 |
| `__pycache__` 残留旧代码 | 修改后清除 `__pycache__` |
