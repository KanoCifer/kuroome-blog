# Logging Rules

日志系统的编排规约（Python 后端）。配套完整英文方案见 [docs/rules/logging-plan.md](logging-plan.md)。

> **Go 端**：Go 后端使用独立日志包 `logger/logger.go`（uber/zap），不经过 structlog。本规约第 1–9 节仅适用于 Python `backend/`。

## 1. 单一来源

- 全仓库日志统一走 `structlog`（`from app.core.logger import logger`），输出 JSON。
- structlog 经 `wrap_for_formatter` 把事件交回 stdlib `logging`，由 `ProcessorFormatter` 统一渲染：业务日志与 uvicorn / taskiq / sqlalchemy 等 foreign 记录走**同一条**处理器链、同一套 JSON 长相。foreign logger（`uvicorn.*` / `taskiq` / `sqlalchemy.engine`）清掉自带 handler、开 `propagate` 透传到 root，**禁止**各框架各自向 stderr 输出第二套格式。
- 终端在 TTY 下用 `ConsoleRenderer`（dev 可读），非 TTY 与文件统一 `JSONRenderer`。
- 禁止 `import logging` 后直接用 stdlib 根 logger 打业务日志；业务日志只用 `structlog` 的 `logger`。
- 日志级别由 `LOG_LEVEL` 环境变量控制（默认 INFO），DB 入库阈值由 `DB_LOG_LEVEL` 控制（默认 WARNING）。

## 2. 三文件路由

日志**按噪音来源分文件**，不按模块/领域分。一次操作横跨多模块时，靠 `trace_id` grep 串联，而非开多个文件对时间戳。

| 文件         | 内容                   | 级别   | 来源                                      |
| ------------ | ---------------------- | ------ | ----------------------------------------- |
| `app.log`    | 业务主轨迹             | INFO+  | service / task 层                         |
| `error.log`  | 异常与错误             | ERROR+ | 任何层                                    |
| `access.log` | 外部系统调用、审计事件 | —      | uvicorn access、第三方 API 调用、敏感操作 |

- 不按 `user` / `article` / `rss` 等领域分文件。跨域调用（如 rss → cache → notify）的日志切不干净，分文件只会让一次排查散落多文件。
- `app.log` 与 `error.log` 已有；`access.log` 是新增的噪音剥离文件，把 access、第三方调用审计从主轨迹里抽走。

## 3. 结构化——message 给人，extra 给机器

- `message` 是**纯英文描述**，不含数值、不含前缀、不含 emoji。
- 数值、计数、耗时写进 `logger.bind(...)` 的 extra，**不要手拼字符串**。

```python
# ❌ 禁止：手拼结构化串、带前缀、带 emoji
logger.info("[MigrationJob] ✅ Completed | duration=4.57s | fetched=9 | migrated=9")

# ✅ 推荐
logger.bind(job="migration", duration=4.57, fetched=9, migrated=9).info("migration completed")
```

- 格式模板里会带上 extra 字段，终端能看到、DB 持久化时整列写入 JSON。structlog 下 extra 即 event_dict 的键值，`JSONRenderer` 原样输出。
- 内部日志**清掉 emoji**（✅❌⚠️📈）。level 本身就是信号，不靠图标。emoji 只在「发给人的外部通知文案」（飞书、Bark、邮件正文）里保留——那本来就是富文本。

## 4. 前缀收口成 bind 字段

`[Taskiq]` / `[Feishu]` / `[SubscriptionCheck]` 这类前缀不写进 message，改用 `bind`：

```python
# ❌
logger.warning("[Feishu] FEISHU_WEBHOOK_URL not configured, skip")

# ✅
logger.bind(channel="feishu").warning("webhook url not configured, skip")
```

下游 sink 按 `record["extra"]["channel"]` 等字段路由或过滤。

## 5. Layer——在 service / task 层打，repo 默认不打

业务日志记**业务事实与决策点**，不记数据操作。

| 层                 | 该记                                         | 不该记                                       |
| ------------------ | -------------------------------------------- | -------------------------------------------- |
| **service / task** | 业务动作的开始/完成/失败、编排结果、降级决策 | —                                            |
| **repo**           | 容错决策（重试/兜底）、吞异常留痕（warning） | INSERT/SELECT 等数据操作、把异常细节重复一遍 |

- "迁移提交成功"记在 task/service 层（那里才有业务语境：这是"迁移"还是"用户注册" repo 不知道）。
- repo 是实现细节，可换 ORM；日志绑死在 repo 层会跟着 SQL 翻译走，丢失业务语义。
- 异常**记录责任在调用方**：repo 透传数据访问，commit 失败抛出，由 service/task 决定记什么、catch 还是 re-raise。
- repo **唯一**该打 log 的两种情况：(1) 内部有重试/降级/缓存兜底等容错逻辑；(2) catch 后吞掉异常返回 None——吃了就得留痕，且只记 warning。

## 6. 串联——trace_id

- FastAPI middleware + taskiq `TraceMiddleware` 注入 `trace_id` 到 `contextvar`（见 `logging_context.py`），structlog processor 自动带上。
- 排查时 `grep <trace_id>` 一次操作的整条链（HTTP → service → repo → redis → db）一次出齐。
- 这是跨模块串联的正确手段，取代"分文件"。

## 7. 持久化——DB 收紧

- DB 入库默认只持久化 `WARNING+`（`DB_LOG_LEVEL`），或要求 `logger.bind(persist=True)` 显式标记才入库。
- 实现为 root 上的专用 `_DBHandler`：终端处理器 `_db_enqueue` 做双门准入（`persist` 或 level ≥ `DB_LOG_LEVEL`），fire-and-forget 经 `log_task.kiq()` 入队。每条记录只入队一次（`_db_enqueue` 仅在该 handler 运行，不在 `shared_processors` 里）。
- 日志写入 PostgreSQL `log` 表（SQLAlchemy 模型），可通过 `/api/v2/system/log` 分页查询。
- 收紧后 `Log` 表降一个数量级，真正关键日志才入库；INFO 轨迹仍可查 `app_info.log`（有轮转保留）。

## 8. 中文 / 英文

- 日志 `message` 统一**英文**。
- 例外：发给人的外部通知正文（飞书 / Bark / 邮件 body）可中文，那是产品文案，不是日志。
- 编码统一 `utf-8`，确保中文能正确落盘（logger sink 已设）。

## 9. 禁止事项

- 禁止 `import logging` 后用 stdlib 根 logger 打业务日志。
- 禁止手拼 `duration=.. | fetched=..` 这类结构化串进 message。
- 禁止 message 里带 emoji（内部日志）。
- 禁止按领域/模块分日志文件（违背单一轨迹原则）。
- 禁止 repo 层打常规数据操作日志。
- 禁止日志里硬编码密钥、token、完整凭据（脱敏后可记标识）。
