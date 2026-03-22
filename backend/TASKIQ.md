# Taskiq 任务调度

本项目使用 taskiq 替代 APScheduler 进行异步任务调度。

## 架构

- **Broker**: RabbitMQ 作为消息队列
- **Result Backend**: Redis 存储任务执行结果
- **Scheduler**: 独立进程管理定时任务
- **Worker**: 独立进程执行任务

## 已迁移任务

| 任务名称               | 调度规则          | 功能描述                  |
|------------------------|-------------------|---------------------------|
| `redis_to_db_migration` | 每 10 分钟执行一次 | 将 Redis 中的访客记录批量迁移到 PostgreSQL |
| `rss_refresh`          | 每天上午 10 点执行 | 刷新所有 RSS 订阅源，保存新文章到 MongoDB |

## 运行方式

### 启动 Worker 进程（执行任务）
```bash
cd backend
taskiq worker app.tasks.broker:broker --fs-discover
```

参数说明：
- `--fs-discover`: 自动发现任务文件
- `--workers N`: 指定 Worker 进程数，默认 2

### 启动 Scheduler 进程（调度定时任务）
```bash
cd backend
taskiq scheduler app.tasks.scheduler:scheduler --fs-discover
```

参数说明：
- `--skip-first-run`: 启动时跳过立即执行所有任务
- `--update-interval N`: 任务调度检查间隔，默认 5 秒

### 启动 FastAPI 主服务（原有服务）
```bash
cd backend
python dev.py
```

## 生产部署

建议使用 systemd 或 supervisor 管理进程：

## 监控

### 查看任务执行结果
```python
from app.tasks.broker import broker

# 获取任务结果
result = await broker.with_result(task_id)
print(result.return_value)
```
