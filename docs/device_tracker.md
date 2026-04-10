# 设备使用追踪器 (Device Tracker)

## 概述

用于追踪贵重电子设备/物品的购买时长，记录使用天数，在整数纪念日（100天、1年、2年等）发送提醒通知。

## 核心功能

1. **设备管理 (CRUD)** — 记录设备名称、分类、购买日期、购买价格
2. **使用天数计算** — `(today - purchase_date).days`
3. **里程碑提醒** — 整数天数纪念日（100天、365天、730天等）
4. **多渠道通知** — 飞书/邮件/Bark（复用订阅通知架构）

## 数据模型

### PostgreSQL: `device` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer (PK) | 主键 |
| user_id | Integer (FK) | 关联用户 |
| name | String(100) | 设备名称，如 "iPhone 15 Pro" |
| category | String(50) | 分类，如 "手机"、"笔记本"、"相机" |
| purchase_date | DateTime | 购买日期 |
| price | Float | 购买价格（可选，用于折旧估算） |
| currency | String(3) | 货币 ISO code，默认 CNY |
| status | Enum | active / retired（仍在使用/已退役） |
| reminder_config | JSON | 里程碑配置 |
| notes | Text | 备注 |

### reminder_config 结构

```json
{
  "milestones": [100, 365, 730, 1000, 1825],
  "channels": ["feishu", "email"],
  "feishu_webhook_url": null,
  "email": null,
  "auto_send": true
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| milestones | list[int] | 里程碑天数列表 |
| channels | list[str] | 通知渠道 |
| feishu_webhook_url | str \| null | 订阅级 Webhook（可选） |
| email | str \| null | 通知邮箱（可选） |
| auto_send | bool | 是否自动发送提醒 |

## API 端点

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/devices` | 获取用户所有设备 |
| GET | `/api/v1/devices/{id}` | 获取设备详情 |
| POST | `/api/v1/devices` | 创建设备 |
| PUT | `/api/v1/devices/{id}` | 更新设备 |
| DELETE | `/api/v1/devices/{id}` | 删除设备 |
| PATCH | `/api/v1/devices/{id}/status` | 更新状态（active/retired） |
| PATCH | `/api/v1/devices/{id}/reminders` | 更新提醒配置 |
| GET | `/api/v1/devices/upcoming` | 获取即将到达里程碑的设备 |
| POST | `/api/v1/devices/{id}/test-notification` | 测试通知发送 |

## 计算逻辑

### 使用天数

```python
from datetime import UTC, date

today = datetime.now(UTC).date()
days_used = (today - device.purchase_date.date()).days
```

### 里程碑检查

```python
def get_reached_milestones(config: dict, days_used: int) -> list[int]:
    """返回已到达但未发送提醒的里程碑"""
    milestones = config.get("milestones", [])
    return [m for m in milestones if days_used >= m]
```

## 文件结构

```
backend/app/
├── models/models.py          # 新增 Device 模型
├── repositories/
│   └── device_repo.py         # Device 数据访问层
├── services/
│   └── device_service.py      # Device 业务逻辑层
├── schemas/
│   └── device.py              # Pydantic schemas
├── tasks/
│   └── device_check_task.py   # 定时任务（检查里程碑）
└── api/v1/
    └── devices.py             # API 路由

frontend/react-app/src/views/Device/   # 前端页面
```

## 定时任务设计

### 调度策略

与 `subscription_check_task` 共用同一个定时任务调度器（每4小时执行一次）。

### 去重机制

使用 Redis SET 存储已发送的里程碑通知：

```
Key: device:milestone:sent
Value: {device_id}:{milestone_days}
TTL: 30天
```

### 任务流程

```
1. 获取所有 status=active 的设备
2. 计算每个设备的 days_used
3. 遍历设备的 milestones 配置
4. 检查 days_used >= milestone 且未发送过
5. 发送通知并标记已发送
```

## 注意事项

### 1. purchase_date 是 DateTime 而非 Date

设备购买通常是具体日期（不含时区），存储时用 `DateTime(timezone=True)` 但比较时用 `.date()` 提取纯日期部分：

```python
billing_date = device.purchase_date
if hasattr(billing_date, "date"):
    billing_date = billing_date.date()
days_used = (today - billing_date).days
```

### 2. 里程碑去重

同一个设备的同一个里程碑只发送一次提醒，即使任务多次执行。使用 Redis SET 原子操作：

```python
is_sent = await redis.sismember(DEDUP_SET_KEY, f"{device_id}:{milestone}")
if is_sent:
    continue
```

### 3. retired 设备不发送提醒

状态为 `retired` 的设备不参与里程碑检查，但仍保留历史数据。

### 4. 通知架构复用

设备通知**完全复用**订阅系统的 `NotificationDispatcher` 和三个 Channel（飞书/邮件/Bark），无需新建通知类。调用方式与订阅系统一致：

```python
payload = NotificationPayload(
    title=f"🎉 {device.name} 已使用 {milestone} 天！",
    body=f"距离购买已过去 {days_used} 天",
    subscription_name=device.name,
    provider=device.category,
    price=device.price or 0,
    currency=device.currency,
    days_until=days_used,
    next_billing_date=device.purchase_date,
)
```

### 5. 前端里程碑配置

前端可提供预设里程碑选项：

```javascript
const PRESET_MILESTONES = [
  { label: "100天", value: 100 },
  { label: "半年 (182天)", value: 182 },
  { label: "1年 (365天)", value: 365 },
  { label: "2年 (730天)", value: 730 },
  { label: "3年 (1095天)", value: 1095 },
  { label: "5年 (1825天)", value: 1825 },
]
```

### 6. 数据库迁移

需要创建迁移文件：

```bash
alembic revision --autogenerate -m "Add device table"
alembic upgrade head
```

### 7. 与订阅系统的区别

| 维度 | 订阅系统 | 设备追踪 |
|------|----------|----------|
| 核心计算 | 下次扣款日期 - today | today - purchase_date |
| 提醒触发 | days_until == 30/7/3/1/0 | days_used == milestone |
| 状态枚举 | active/canceled/paused/expired | active/retired |
| 计量单位 | 天（倒计时） | 天（正计时） |
| 通知内容 | "还有X天续费" | "已使用X天！" |

## 验证方式

```python
# 测试里程碑计算
def test_milestone_calculation():
    from datetime import UTC, timedelta
    device = MagicMock()
    device.purchase_date = datetime.now(UTC) - timedelta(days=365)
    device.name = "Test Device"

    today = datetime.now(UTC).date()
    days_used = (today - device.purchase_date.date()).days
    assert days_used == 365
```

## 前端需要的能力

1. **设备列表页** — 展示所有设备，显示已使用天数和下次里程碑
2. **设备详情/编辑弹窗** — 创建设备、编辑信息、管理里程碑
3. **通知渠道配置** — 与订阅共用配置组件
4. **即将到达里程碑** — 首页 Bento 展示

## 迁移文件位置

`backend/app/models/models.py` — 在现有 `Subscription` 模型后新增 `Device` 类
