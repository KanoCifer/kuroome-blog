# 日志系统设计 v2 —— 瘦身 + event 表

> 状态：设计稿，待审核
> 配套规约：`docs/rules/logging.md`（实现后需同步更新 §1/§2/§7/§9）
> 关联 wayfinder ticket：#5

## 1. 设计约束（已定）

| 维度       | 决定                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| 去掉的     | access.log、`persist=True` 标记、Taskiq 入库链路                       |
| 保留的     | trace_id、JSON 结构化、双文件 (app/error)、DB 持久化 (WARNING+)        |
| 第三方框架 | 仅干掉 uvicorn.access；sqlalchemy/taskiq 日志保留（propagate 到 root） |
| 新增       | `event` 表，承载 INFO+persist 原位语义（启动/部署/通知失败）           |

## 2. JSON 输出 schema（冻结 —— Go 端对齐契约）

输出**仅保留**以下四键，不附带 callsite / level_number / logger_name / 摊平 extra：

```json
{
  "trace_id": "a1b2c3d4",
  "level": "warning",
  "message": "email send failed",
  "timestamp": "2026-07-10T08:30:00.000000+00:00"
}
```

- `message` = 原 structlog `event` 键（重命名对齐 Go 端语义）
- 去掉 `persist` / `persist_to`（不再写入 event_dict）
- 去掉 `level_number` / `logger_name` / `filename` / `func_name` / `lineno` 等字段
- `extra`（`bind` 摊平字段）不输出 —— 仅 `message` 文本承载语义

### 2.1 对应的 processor 链（精简后）

`shared_processors` 缩减为：

```python
shared_processors = [
    _add_trace_id,
    structlog.stdlib.add_log_level,
    structlog.stdlib.PositionalArgumentsFormatter(),
    _timestamper,
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
    structlog.processors.UnicodeDecoder(),
]
```

去掉：`add_log_level_number` / `add_logger_name` / `CallsiteParameterAdder`

## 3. Event 表 —— "关键服务事件"

### 3.1 定位

`INFO + persist=True` 在旧设计里意为"这条 INFO 尽管级别低、仍希望落库供查询"。
新版去掉 persist 门控后，这些业务语义需要一个更明确的安放点 —— `event` 表：

- 仅承载**关键服务事件**（启动 / 部署 / 启动失败），不是全量 INFO
- 语义上区别于 `log` 表：log 是机器噪音/WARNING+ 持久化；event 是给人看的业务事件
- 前端以"系统事件"列表展示，分页查询

### 3.2 模型

```python
# app/models/event.py
class Event(Base):
    __tablename__ = "event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True,
    )
    type: Mapped[str] = mapped_column(String(50), index=True)   # startup | deploy | notify_failure | custom
    source: Mapped[str] = mapped_column(String(100))              # 触发来源标识
    title: Mapped[str] = mapped_column(String(255))               # 短标题
    message: Mapped[str] = mapped_column(Text)                    # 详细描述
    extra: Mapped[dict] = mapped_column(JSON, default=dict)       # 扩展字段

    __table_args__ = (Index("ix_event_type_timestamp", "type", "timestamp"),)
```

### 3.3 写入：独立 async 函数（不复用 log worker）

```python
# app/services/event_service.py
async def record_event(
    type: str,
    title: str,
    message: str = "",
    source: str = "",
    extra: dict | None = None,
) -> Event:
    async with get_async_session() as session:
        event = Event(type=type, title=title, message=message, source=source, extra=extra or {})
        session.add(event)
        # get_async_session 退出时统一 commit
    return event
```

独立原因：

- event 调用点极少（3 处）且都是 fire-and-forget 语义，不需要工作队列
- 复用 log worker 会耦合两者的背压/错误处理策略，得不偿失
- 独立函数测试更干净

### 3.4 调用点迁移

| 原位                                                                           | 改为                                                                        |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `admin.py:257` `logger.bind(persist=True).info("后端服务升级")`                | `await record_event("deploy", "后端服务升级", source="webhook_admin")`      |
| `main.py:81` `app_logger.bind(persist=True).info(f"API服务启动｜时间：{now}")` | `await record_event("startup", f"API服务启动｜时间：{now}", source="boot")` |
| `main.py:93` `app_logger.bind(persist=True).warning("发送启动通知失败")`       | `await record_event("notify_failure", "发送启动通知失败", source="boot")`   |

原位 `logger.bind(persist=True).info(...)` 整体替换为 `record_event(...)`，**不再经 logger**（它已经是独立 async 持久化）。

## 4. Log 入库链路 —— 去掉 Taskiq，换 channel worker

### 4.1 设计

```
logger (sync, ProcessorFormatter)
   │
   ▼
_db_enqueue(gate: level ≥ DB_LOG_LEVEL)   ← 纯 level 门控，不再判 persist
   │
   ▼
asyncio.Queue                              ← 解耦同步 logger 与异步 DB
   │
   ▼
_log_worker()  [long-running background task]  ← 单 consumer，async session 直写 Log 表
```

### 4.2 关键组件

**Queue**：模块级 `asyncio.Queue(maxsize=1000)`，`maxsize` 防内存无限增长。

**worker**：

```python
async def _log_worker():
    while True:
        payload = await _log_queue.get()
        try:
            async with get_async_session() as session:
                session.add(Log(**payload))
        except Exception:
            sys.stderr.write(...)
        finally:
            _log_queue.task_done()
```

**启动 / 生命周期**：worker 作为 background task 在 app startup 时 `create_task`，shutdown 时 `cancel` 或 `await _log_queue.drain()`。

### 4.3 Taskiq 解耦

- `log_task.py` 去掉 `@broker.task` 装饰器，退化为普通 async 函数（或直接内联进 worker）
- logger.py 去掉 `from app.plugins.task.tasks.log_task import log_task` + `loop.create_task(log_task.kiq(...))`
- 去掉 `_kiq_tasks: set[asyncio.Task]`（防 GC 的 task 引用集合）
- Taskiq broker 本身保留给其他任务用（migration / notification 等），仅 `log_task` 解耦

## 5. 文件输出层 —— 双文件

```
root
 ├── stderr                          ConsoleRenderer / JSONRenderer
 ├── app_info.log   (_InfoFilter)    INFO ≤ level < ERROR
 └── app_error.log  (_ErrorFilter)   level ≥ ERROR
```

**删除**：

- `_AccessFilter` 类
- `_ACCESS_ONLY_LOGGERS` 常量
- `_is_access_record()` 函数
- `access_log_path` / `_access_handler`
- `ACCESS_MAX_LOG_SIZE` / `ACCESS_BACKUP_COUNT` 常量

**简化**：`_InfoFilter` 从 `return not _is_access_record(...) and level < ERROR` 简化为 `return record.levelno < _ERROR_NO`

**保留**：`_ErrorFilter`、双 `RotatingFileHandler`、`_install_foreign_propagation`（uvicorn.access 继续清 handler + propagate=True，但进入 root 后归 app_info.log）

## 6. logger.py 改动对照

| 节                             | 动作                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `_ACCESS_ONLY_LOGGERS`         | 删除                                                                             |
| `_is_access_record()`          | 删除                                                                             |
| `_AccessFilter`                | 删除                                                                             |
| `_InfoFilter.filter`           | 简化（去掉 access 分支）                                                         |
| `_DB_EXCLUDE`                  | 收缩（去掉 `persist`/`persist_to`，保留其他）                                    |
| `_db_enqueue`                  | 重写：去掉 persist 判断 + `log_task.kiq()`，改为 `await _log_queue.put(payload)` |
| `_DBHandler`                   | 形态调整（终端处理器输出到 queue）                                               |
| `_kiq_tasks`                   | 删除                                                                             |
| `_install_foreign_propagation` | 不变                                                                             |
| `shared_processors`            | 不变（trace_id / callsite / exc_info 全保留）                                    |
| `_make_formatter`              | 不变                                                                             |
| `_stderr_handler`              | 不变                                                                             |
| 双文件 handler 组装            | 不变                                                                             |
| `log_config=None` (dev.py)     | 不变                                                                             |

## 7. 受影响清单（执行层）

需改动的文件：

- `app/core/logger.py` —— 主改造
- `app/models/event.py` —— 新建
- `app/services/event_service.py` —— 新建
- `app/models/__init__.py` —— 注册 Event 到 document_models
- `app/api/v1/admin.py:257` —— 改 record_event
- `app/main.py:81,93` —— 改 record_event + 启动/关闭 worker
- `app/plugins/task/tasks/log_task.py` —— 去 @broker.task（或删除，worker 内联）
- `app/plugins/task/tasks/__init__.py` —— 去除 log_task re-export
- `app/plugins/task/__init__.py` —— 去除 log_task re-export
- `test/` —— 新增 event + logger 行为测试

## 8. 测试计划

```python
# test/test_logger.py（新建）
- test_warning_log_queues_to_worker()
- test_info_log_does_not_queue()
- test_trace_id_auto_injected()
- test_no_access_handler_present()

# test/test_event.py（新建）
- test_record_event_persists()
- test_record_event_fields()

# test/test_log_repo.py（保留，LogRepo 未改）
```

## 9. 后续

本设计冻结后：

- Go 端（#6/#8）对齐此 JSON schema + event 概念（可能 Go 端暂不建 event 表，仅对齐 log schema）
- `docs/rules/logging.md` 更新 §1/§2/§7/§9
