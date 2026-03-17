# Taskiq 任务调度

本项目使用 taskiq 替代 APScheduler 进行异步任务调度。

## 架构

- **Broker**: Redis Stream 作为消息队列 (redis://localhost:6379/3)
- **Result Backend**: Redis 存储任务执行结果
- **Scheduler**: 独立进程管理定时任务
- **Worker**: 独立进程执行任务

## 已迁移任务

| 任务名称               | 调度规则          | 功能描述                  |
|------------------------|-------------------|---------------------------|
| `redis_to_db_migration` | 每 10 分钟执行一次 | 将 Redis 中的访客记录批量迁移到 PostgreSQL |
| `rss_refresh`          | 每天上午 10 点执行 | 刷新所有 RSS 订阅源，保存新文章到 MongoDB |

## 运行方式

### 1. 安装依赖
```bash
cd backend
pip install -r requirements.txt
# 或者直接安装新增依赖
pip install taskiq-scheduler>=0.4.0
```

### 2. 启动 Worker 进程（执行任务）
```bash
cd backend
taskiq worker app.tasks.broker:broker --fs-discover
```

参数说明：
- `--fs-discover`: 自动发现任务文件
- `--workers N`: 指定 Worker 进程数，默认 1

### 3. 启动 Scheduler 进程（调度定时任务）
```bash
cd backend
taskiq scheduler app.tasks.scheduler:scheduler --fs-discover
```

参数说明：
- `--skip-first-run`: 启动时跳过立即执行所有任务
- `--update-interval N`: 任务调度检查间隔，默认 5 秒

### 4. 启动 FastAPI 主服务（原有服务）
```bash
cd backend
python dev.py
```

## 生产部署

建议使用 systemd 或 supervisor 管理进程：

### Worker 服务配置示例 (`taskiq-worker.service`)
```ini
[Unit]
Description=Taskiq Worker
After=network.target redis.service

[Service]
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/path/to/.venv/bin/taskiq worker app.tasks.broker:broker --fs-discover --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Scheduler 服务配置示例 (`taskiq-scheduler.service`)
```ini
[Unit]
Description=Taskiq Scheduler
After=network.target redis.service

[Service]
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/path/to/.venv/bin/taskiq scheduler app.tasks.scheduler:scheduler --fs-discover
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 监控

### 查看任务执行结果
```python
from app.tasks.broker import broker

# 获取任务结果
result = await broker.get_result(task_id)
print(result.return_value)
```

### 任务重试配置
在 `broker.py` 中添加重试中间件：
```python
from taskiq import TaskiqMiddleware
from taskiq.retry import RetryMiddleware

broker = RedisStreamBroker(
    url="redis://localhost:6379/3",
).with_result_backend(result_backend).with_middlewares(
    RetryMiddleware(
        max_retries=3,
        delay=1.0,
    )
)
```

## 从 APScheduler 迁移说明

1. **原有 APScheduler 代码已从 `main.py` 中移除**
2. **原有任务逻辑保持不变**，仅做了最小修改以适配 taskiq
3. **任务调度规则完全保持一致**：
   - 数据迁移任务：每 10 分钟执行一次
   - RSS 刷新任务：每天上午 10 点执行一次
4. **异常处理逻辑保持不变**，任务失败时会自动重试，Redis 数据不会丢失
