# 前端架构改造落地方案（工程版）

> 项目：`ReadingList/frontend`  
> 日期：2026-03-30  
> 适用范围：`frontend/src/**`

---

## 0. 目标与范围

## 0.1 总目标

通过“小步快跑 + 边界测试先行”的方式，降低前端关键链路的耦合度，
优先提升以下能力：

1. 认证与请求链路的可维护性
2. 关键流程（401/refresh/retry）的可测试性
3. 后续认证与 Todo 模块重构的可落地性

## 0.2 本轮范围（In Scope）

- 第一优先：`src/request.ts` + `src/utils/refresh.ts` 深模块化
- 第二优先：`src/stores/auth.ts` 的边界收敛（Phase 1～3 已落地）
- 建立配套边界测试骨架（Vitest）

## 0.3 非目标（Out of Scope）

- 不做全量目录重构（如一次性 FSD 全迁移）
- 不改后端接口协议
- 不在本轮处理全部页面级“大组件拆分”

---

## 1. 当前问题基线（已确认）

## 1.1 高耦合模块

- `src/stores/auth.ts`：同时承担 hydrate、token、heartbeat、router、notifier
- `src/request.ts` + `src/utils/refresh.ts`：刷新逻辑分散，隐式契约较多
- `src/stores/todos.ts`：hydrate 策略 + CRUD + 本地同步耦合

## 1.2 测试现状

- `src` 下 `*.test.*` / `*.spec.*` 较少
- 关键可靠性链路尚未形成稳定边界测试

---

## 2. 实施策略（默认工作方式）

1. **先收边界，再动实现**：先定义模块公共接口与职责，再改内部逻辑。
2. **先补测试，再做替换**：关键链路先有可执行测试，避免盲改。
3. **一阶段一目标**：每个里程碑只解决一个核心不确定性。
4. **兼容优先**：优先保持对外接口不变，减少调用方改动。

---

## 3. 里程碑计划（Milestones）

## M0：基线冻结（0.5 天）

**目标**：冻结改造前行为，防止回归无锚点。

**任务**：

- 梳理现有请求拦截器行为矩阵（CSRF / 401 / retry）
- 标记核心调用点（auth、todos、router）
- 输出风险列表与回滚点

**交付物**：

- 行为基线文档（可附到本文件）
- 风险清单（按高/中/低分级）

**验收标准**：

- 团队对“当前行为预期”达成一致
- 每个高风险点都有对应回滚策略

---

## M1：HTTP 刷新链路深模块化（1～2 天）

**目标**：把 `request.ts` + `refresh.ts` 收敛为一个内聚边界。

**任务**：

- 定义统一刷新编排入口（模块内部）
- 将 refresh 逻辑内聚，减少跨文件隐式依赖
- 保持 request 对外调用方式兼容

**建议改动文件**：

- `src/request.ts`（主改）
- `src/utils/refresh.ts`（收敛或淘汰）

**验收标准**：

- 对外 `request` 使用方式保持不变（调用方无需批量改造）
- 401 刷新成功后可自动重试原请求
- refresh token 缺失/失败路径行为稳定且可预期

**回滚点**：

- 保留改造前分支与旧文件快照
- 若出现大面积 401 异常，回滚到 M0 基线

---

## M2：边界测试补齐（1 天）

**目标**：建立可靠的“关键链路测试护城河”。

**测试矩阵（最低集）**：

1. `401 -> refresh -> retry` 成功
2. refresh token 缺失时直接失败
3. refresh 失败时拒绝并停止重试
4. CSRF 重试达到上限后拒绝

**建议测试位置**：

- `src/request.test.ts` 或 `src/__tests__/request.spec.ts`

**验收标准**：

- 上述 4 类场景全部可稳定通过
- 本地重复执行结果一致（无随机失败）

---

## M3：Auth 边界收敛（1～2 天）

**目标**：将 `auth.ts` 从“全能编排器”收敛为清晰边界。

**任务**：

- 明确 auth 对外最小接口（如：hydrate / login / logout / session state）
- 将 heartbeat、缓存细节、通知副作用尽量内聚
- 路由守卫仅依赖 auth 公共边界，不依赖内部时序细节

**建议改动文件**：

- `src/stores/auth.ts`
- `src/router/index.ts`

**验收标准**：

- 路由守卫逻辑简化，分支减少
- 认证状态流转在边界层可测试
- 无新增循环依赖

**实现状态**：✅ 已完成（2026-03-30）

**已落地改动（按阶段）**：

1. **Phase 1：边界拆分（不改 store 对外 API）**
   - 新增 `src/auth/types.ts`：统一 `UserInfo` 类型定义。
   - 新增 `src/auth/tokenService.ts`：集中 refresh token 读写。
   - 新增 `src/auth/userCache.ts`：集中 session cache 读写。
   - 新增 `src/auth/heartbeat.ts`：心跳生命周期控制。
   - 新增 `src/auth/authGateway.ts`：认证请求边界（me/login/logout/passkey/heartbeat）。
   - `src/stores/auth.ts` 改为编排上述边界模块，先实现“内部解耦”。

2. **Phase 2：收敛 store 公共接口 + 登录流修正**
   - `src/stores/auth.ts` 不再向页面暴露 token/timer 控制接口。
   - 新增 `getPasskeyAuthenticationOptions`、`loginWithPasskey` 等边界动作。
   - `login()` 修正为 `await initCSRF()`，并移除 store 内路由跳转副作用。
   - `login()` 错误分支改为抛出（`throw`），恢复页面级表单错误处理能力。
   - `src/views/auth/LoginView.vue`、`src/views/auth/MobileLogin.vue`：
     改为通过 auth boundary 获取 passkey options，
     并使用 `startAuthentication({ optionsJSON })`（兼容 simplewebauthn v13）。

3. **Phase 3：副作用注入，移除 auth store 对 router/notifier 的直接耦合**
   - 新增 `src/auth/sideEffects.ts`：
     - `AuthSideEffects` 接口（`notifySuccess` / `notifyError` / `navigateToHome`）
     - `configureAuthSideEffects()` 注入
     - `getAuthSideEffects()` 获取
   - `src/stores/auth.ts`：
     - 删除 `router` 与 `useNotificationStore` 直接 import
     - 改为通过 `sideEffects` 执行通知与导航副作用
   - `src/main.ts`：应用启动时集中装配副作用：
     - 注入通知实现（基于 `useNotificationStore`）
     - 注入导航实现（`router.push("/")`）

**实现逻辑（工程视角）**：

- **为什么用注入而不是继续直连**：
  认证 store 是领域边界，不应感知 UI 基础设施（router/notifier）具体实现。
  把副作用搬到 `main.ts` 组合层后，store 更易测试，也更容易替换实现。

- **为什么保留默认 no-op 实现**：
  防止在极端初始化顺序下直接抛错，保证边界可用性。
  同时通过应用入口统一 `configure`，确保正常运行时行为完整。

- **当前边界关系**：
  - `stores/auth` 依赖：`authGateway` / `tokenService` / `userCache` /
    `heartbeat` / `sideEffects`。
  - `stores/auth` 不再直接依赖：`router`、`notification store`。
  - `main.ts` 负责把 UI 基础设施实现注入到 auth 副作用边界。

**Phase 3 验收结果**：

- [x] `auth.ts` 中无 `router`、`useNotificationStore` 直接引用
- [x] 登录/Passkey/登出路径仍可触发对应通知与跳转
- [x] 未引入新的循环依赖

---

## M4：Todo 编排解耦（可选，1～2 天）

**目标**：拆分 `todos.ts` 的 hydrate/CRUD/同步职责，降低跨 store 耦合。

**任务**：

- 将 hydrate 策略与 CRUD 操作分离
- 收敛通知副作用入口
- 稳定 guest/auth 两套状态切换行为

**验收标准**：

- guest/auth 切换场景下状态一致
- 本地同步路径可测试且可观测

---

## 4. 工单拆解（可直接建任务）

## EPIC A：请求链路深模块化

- A1：梳理并文档化现有 interceptor 行为
- A2：统一 refresh 编排入口
- A3：移除/收敛分散 refresh 逻辑
- A4：补齐 request 边界测试

## EPIC B：认证边界收敛

- B1：定义 auth 最小公共接口
- B2：拆分内部副作用（缓存/心跳/通知）
- B3：router guard 改为依赖 auth 边界
- B4：补认证边界测试

## EPIC C：Todo 解耦（后续）

- C1：拆 hydrate 与 CRUD
- C2：统一错误与通知出口
- C3：guest/auth 切换场景测试

---

## 5. 验收与质量门禁

每个里程碑完成后，至少满足：

1. 类型检查通过：`pnpm type-check`
2. 相关单测通过：`pnpm test:unit`
3. 核心场景人工回归通过：登录、刷新、受保护路由访问

> 说明：本项目前端改动阶段默认不执行 `pnpm build` 作为强制门禁。

---

## 6. 风险清单与应对

## 高风险

- **刷新重试死循环**：通过 retry 标记与上限测试防止
- **认证状态错乱**：通过状态机化测试（未登录/已登录/过期）防止

## 中风险

- **调用方隐式依赖旧行为**：阶段内保持兼容接口，必要时加适配层
- **测试不稳定**：统一 mock 时钟/网络，避免非确定性

## 低风险

- 文档与实现偏差：里程碑结束时同步更新本文件

---

## 7. 发布与回滚 Runbook（简版）

1. 合并前：
   - 通过 type-check + test:unit
   - 完成登录/刷新/路由守卫人工回归
2. 发布后观察：
   - 401 比例
   - 登录态丢失比例
   - 关键页面错误率
3. 若异常超阈值：
   - 立即回滚到上一个里程碑提交
   - 保留日志与复盘记录

---

## 8. 建议排期（单人估算）

- M0：0.5 天
- M1：1～2 天
- M2：1 天
- M3：1～2 天
- M4（可选）：1～2 天

**总计**：3.5～7.5 天（不含评审与缓冲）

---

## 9. 下一步建议（立即可执行）

Auth Phase 1～3 已完成，下一步建议切回 **M1 + M2** 做“请求刷新链路 + 边界测试”收口：

1. 对 `request/refresh` 建立单一刷新编排入口（避免多点重试策略漂移）。
2. 补齐 `401 -> refresh -> retry` 与失败分支测试矩阵（至少 4 条关键用例）。
3. 在此基础上再推进 M4（Todo 编排解耦），降低并行改造风险。
