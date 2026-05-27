# Backend Architecture Audit — Deepening Opportunities

Date: 2026-05-27

---

## 1. FishingService: 单例 + DI 双实例，评分逻辑两处实现

**Files:** `services/fishing_service.py`, `services/fishing_expert.py`, `services/fishing_model_service.py`, `core/weather_analyzer.py`, `api/v2/fishing.py`

**Problem:** `FishingService` 同时承担两个角色——无状态工具包（`parse_weather_data`, `parse_tide_info`, `get_qweather_index`, `build_record`, `get_level`）和有状态编排器（`calculate_fishing_index`, `auto_train_if_needed`, `save_feedback`）。API 层创建了**两个独立实例**：模块级单例（第 352 行，无 repo）和 DI 注入实例（经 `container.py`）。`GET /index` 用单例，`POST /feedback` 用 DI 实例，两者不共享 repo/model 状态。此外 feedback 路径绕过 `calculate_fishing_index()` 直接调用 `expert.calculate()` 并手动算残差，评分逻辑存在两处。

**Solution:** 拆分为无状态 `FishingIndex`（纯计算）+ 薄 `FishingService` 编排器（组合 index + repo + model）。消除单例，统一用 DI。

**Benefits:** 评分逻辑归一；`FishingIndex` 变深模块（小接口，多行为）；单例 vs DI 问题消失。

---

## 2. WeatherAnalyzer: 浅模块 + 层级反转

**Files:** `core/weather_analyzer.py`

**Problem:** 427 行但只有一个公共方法 `analyze_weather_stream()`，内部复杂性全部暴露（8 个嵌套 Pydantic schema、动态 agent 创建、正则后处理、fire-and-forget 训练任务）。从核心层导入服务层的 `fishing_service`，违反依赖方向。系统提示中硬编码了专家权重，与 `fishing_expert.py` 重复。

**Solution:** 将训练副效应提取到 `FishingService`；通过构造函数注入潮汐解析依赖；提示词从 `FishingExpertScorer.WEIGHTS` 动态读取。

**Benefits:** 层级反转消失；权重单一来源；训练逻辑集中。

---

## 3. auth.py: API 层吸收了服务层职责

**Files:** `api/v1/auth.py` (619 lines), `services/user_service.py`

**Problem:** auth.py 包含 GitHub OAuth HTTP 调用（raw httpx）、refresh token 完整流程、`_build_login_response()` 等业务逻辑，都应在服务层。

**Solution:** 提取 `AuthService`，包含 `exchange_github_code()`、`refresh_tokens()` 等方法。

**Benefits:** 认证逻辑可脱离 HTTP 测试；token 生命周期规则集中。

---

## 4. Subscription & Device: 服务透传 + 仓库含业务逻辑

**Files:** `services/sub_service.py` (55 lines), `repositories/sub_repo.py` (166 lines), `services/device_service.py` (57 lines), `repositories/device_repo.py` (118 lines)

**Problem:** 两个服务都是透传层（删除后不增加复杂度）。仓库中包含业务逻辑：`SubRepo.get_due_subscriptions()` 的到期筛选、`DeviceRepo.get_devices_with_upcoming_milestone()` 的里程碑计算。

**Solution:** 将业务逻辑从 repo 上提到 service。repo 退化为纯数据访问。

**Benefits:** 领域规则集中在服务层；repo 变为可替换适配器。

---

## 5. Notification: `send_device_reminder` 不在 ABC 上，也不在服务层

**Files:** `notification/__init__.py`, `notification/dispatcher.py`, `services/notification_service.py`

**Problem:** 三个 channel adapter 都实现了 `send_device_reminder()`，但 `NotifierBase` ABC 没有声明它（dispatcher 通过 getattr 发现）。`NotificationService` 也没有暴露该方法，设备提醒不可达。

**Solution:** ABC 加上 `send_device_reminder` 抽象方法；`NotificationService` 暴露该方法。

**Benefits:** 接口诚实；类型检查器可在定义时捕获遗漏。

---

## 6. Admin: 硬编码 `id in (1, 2)` 无配置接缝

**Files:** `models/models.py` (161-164), `api/des/auth.py` (46)

**Problem:** `User.is_admin` 硬编码 ID 白名单。数据库 reseed 可能静默转移管理员权限。

**Solution:** 移到配置 `settings.ADMIN_USER_IDS: list[int]`。

**Benefits:** 管理员决策改为配置驱动。

---

## 7. FishingRepo: 误导性接口（接受 AsyncSession，使用 Beanie）

**Files:** `repositories/fishing_repo.py`

**Problem:** `__init__` 接受 `session: AsyncSession | None` 但从未使用，所有方法通过 Beanie ODM 操作。

**Solution:** 移除 `session` 参数。

**Benefits:** 接口与实现一致。

---

## 8. MonitorService: 引用未定义属性的潜在 Bug

**Files:** `services/monitor_service.py` (222-266)

**Problem:** `cleanup_stale_heartbeats` 使用 `self._tracker` 和 `self.redis`，但 `__init__` 只设置了 `self.repo`。调用必崩。

**Solution:** 注入 `tracker` 和 `redis`，或移除死代码。
