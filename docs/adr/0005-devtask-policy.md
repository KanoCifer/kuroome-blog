# ADR-0005: DevTask 看板纯规则模块

## Status

Accepted

## Context

`frontend/src/views/todos/` 是 v4.6 之后的新模块（开发任务工作台，3 视角 = 推进 / 规划 / 回顾），覆盖 5 个 store 消费者、3 个 panel 子组件、1 个全局抽屉 + 1 个 modal：
- `stores/v3devtasks.ts` —— workspace store
- `views/todos/TodoListView.vue` —— 顶层 page，承载 4 个 tab
- `views/todos/components/{FrontierPanel, PlanningPanel, KanbanPanel, ReviewPanel}.vue` —— 4 个 panel
- `views/todos/components/DevTaskModal.vue` —— modal 表单
- `layouts/components/TodoModal.vue` —— 全局右下浮窗

未抽取策略前，每个消费者**各自内联**一份 DevTask 规则语义的子集：

| 重复内容 | 内联文件数 | 行数/处 | 合计 |
| --- | --- | --- | --- |
| `PRIORITIES: DevTaskPriority[]` 字面量 | 5 | 2-4 行 | ~15 行 |
| `priorityWeight` 函数 / 对象 | 2 (TodoModal × 2 处) | 4-6 行 | ~10 行 |
| `V3_STATUSES` / `STATUS_CYCLE` 与 `cycleStatus` 分支 | 2 (store + modal) | 5-8 行 | ~14 行 |
| `frontier` / `inProgress` / `completedThisWeek` 派生过滤 | 3 (store + 2 panel) | 5-12 行 | ~28 行 |
| `typeDistribution` 计数 | 1 (ReviewPanel) | 9 行 | 9 行 |
| 日期格式化 `formatToday` / `formatCurrentWeekRange` | 2 (store 提供 + ReviewPanel 调) | 3-4 行 | 8 行 |
| **合计** | | | **~84 行分散在 8 个文件** |

呈现两类真问题：

### 问题 1:策略漂移风险

`PRIORITIES` 排序（P0 紧急 → P3 低）若被任何一处写错，UI 选择器会与排序键、紧急态计数三者一起崩。三处定义之间目前靠"作者记忆同一份先后顺序"维持一致，新增"故障工单"或"实验"类型时极容易漏改某处。

### 问题 2:前端无法单测策略

`PRIORITIES` / `STATUS_CYCLE` / `frontier` 排序逻辑全部内嵌在 .vue 模板或 computed 内，只能跟着 store 跑端到端测试（需要 mock 后端 + mount 组件）。引入单测前先需要拆函数 → 收益不够正。

### 为什么 store 不该背这口锅

Pinia store 的本职是 **state + I/O**（`tasks` ref + `fetchTasks`/`createTask`/`updateTask`/`cycleStatus`/`deleteTask`/`syncColumn`）。它可以**委托**给纯函数做派生，但不应该**拥有**派生规则 —— 一旦 store 暴露 `frontier` / `inProgress` 等 computed，消费者就被绑死在"先取 store"这条唯一路径上，无法在 store 不可用的场景（比如 React 端的 `react-app/src/services/todoService/`、未来开发脚本、e2e 测试）复用同一份规则。

### 黄金参考:ADR-0002 的 runtime + 端口模式

`composables/fishing/fishingMapRuntime.ts:1` 把"地图行为"封装为 `FishingMapRuntime` 类，通过端口注入 AMap SDK。DevTask 这里没有"SDK 副作用"，但有"被 8 个文件依赖的纯策略"，形态不同：**没有状态、没有副作用的纯函数模块**比 class 更合身（ADR-0003 已经把无意义的 `AMapEngine` 端口删掉了 —— 没有第二个 adapter 实例就是假灵活性）。

## Decision

执行"最小可工作"抽取 + barrel 聚合 + Pinia store 瘦身：

### 1. 新建 `frontend/src/composables/todo/devTaskPolicy.ts`

**纯函数模块**，零依赖（不引 Vue / Pinia / API client / i18n）。导出：

```ts
// 常量
V3_STATUSES       // 5 段状态，按看板左→右阅读流排序
PRIORITIES        // P0 紧急 → P3 低，按权重升序
STATUS_CYCLE      // 状态机：跳开"已搁置"，已完成 → 待评估（闭环起点）

// 派生
nextStatus(current)         // 一次推进
priorityWeight(p)           // 已知 → 0/1/2/3；未知/null/undefined → 9（队尾）
tasksByStatus(tasks, s)     // 过滤 + 按 sort_order 升序 + 排除已软删
frontier(tasks)             // 未完成 + 无阻塞依赖；按 优先级 / 截止日 排序
completedThisWeek(tasks)    // 自然周（周一为起），按 updated_at 倒序
inProgress(tasks)           // ≡ tasksByStatus(tasks, '进行中')
totalActive(tasks)          // 计数：未删 & 未完成
completedCount(tasks)       // 计数：未删 & 已完成
urgentActive(tasks)         // 计数：未删 & 未完成 & P0
typeDistribution(tasks, types?)  // 计数：未删 & 在 types 列表内；默认 4 类
planSyncColumn(tasks, status, orderedSlugs)  // 不可变重排，返回新数组
```

**关键设计**：

- **`priorityWeight` 已知/未知双分桶**：已知 4 优先级映射到 0–3，未知/null/undefined 统一 9 排到队尾。杜绝"新加的 P99 实验错误地排第一"这种 bug。
- **`planSyncColumn` 不可变**：用 `{ ...t, status, sort_order: idx }` spread 返回新任务对象。Vue 响应式仍能感知到 `tasks.value` 被替换为新数组 —— 不需要 in-place mutate。
- **`STATUS_CYCLE` 显式声明"已搁置是用户主动选择"**：链式调用 `nextStatus(nextStatus(nextStatus('待评估')))` 推进到"已完成"；单独 `nextStatus('已搁置')` 也回 '待排期'（非"已搁置 → 继续推进"）。

### 2. 新建 `frontend/src/lib/date.ts`

**通用日期助手**（无 Vue 依赖，可被 store / composable / 工具脚本共用）：

```ts
formatToday(): string                 // 'YYYY-MM-DD'
formatCurrentWeekRange(opts?): string // 'YYYY-MM-DD ~ YYYY-MM-DD'，周起始可配（0 = Sun / 1 = Mon）
```

放 `lib/` 而非 `composables/` —— 没有 reactive state、没有 `useXxx` 形态，纯粹是模块级工具。Vue 生态里 `composables/` 已有的隐性契约是"返回 reactive state 给模板用"（ADR-0004 引用），不该破。

### 3. `stores/v3devtasks.ts` 收缩到 state + I/O

新 store 表面只剩：

```ts
return {
  // state
  tasks, loading,
  // I/O（按后端契约命名,1:1 对应 gateway）
  fetchTasks, createTask, updateTask, cycleStatus,
  deleteTask, hardDeleteTask, syncColumn,
  // 唯一保留的 re-export,供 router meta / 未迁移的旧引用继续用
  V3_STATUSES,
};
```

`cycleStatus` 内部委托给 `nextStatus`，`syncColumn` 内部委托给 `planSyncColumn`。派生（`frontier` / `inProgress` / 等）从 store 返回值中**移除** —— 消费者按需 import。

### 4. 8 个消费者改 import

| 文件 | 改造 |
| --- | --- |
| `composables/todo/index.ts` | barrel `export * from './devTaskPolicy'` |
| `stores/v3devtasks.ts` | `import { nextStatus, planSyncColumn, V3_STATUSES } from '@/composables/todo/devTaskPolicy'` |
| `views/todos/TodoListView.vue` | tab 计数改用 `frontier/totalActive/completedCount(store.tasks)` |
| `views/todos/components/FrontierPanel.vue` | 新增 `frontierTasks` / `inProgressTasks` / `doneThisWeek` computed |
| `views/todos/components/ReviewPanel.vue` | `weekRange` 直接调 `formatCurrentWeekRange()`；用 `inProgress / urgentActive / typeDistribution` |
| `views/todos/components/{PlanningPanel,KanbanPanel,DevTaskModal}.vue` | 删本地 `PRIORITIES`，从 `@/composables/todo` 取 |
| `layouts/components/TodoModal.vue` | 同样删本地字面量 + 排序改用 `priorityWeight` |

### 5. 测试

新建 `frontend/src/composables/todo/__tests__/devTaskPolicy.test.ts`，覆盖：

- 常量内容（5 个）· 状态机 5 段转换 + 链式推进 · `priorityWeight` 已知 4 桶 + 未知降级
- `tasksByStatus` 3 用例（过滤、sort_order 升降序、缺失 sort_order 视为 0）
- `frontier` 6 用例（排除已完成 / 阻塞 / 软删、按优先级、截止日升序、截止日优先于无截止日）
- `completedThisWeek` · `inProgress` · 4 个计数
- `typeDistribution` 默认 4 类 + 自定义子集
- `planSyncColumn` 4 用例（重排赋新 sort_order、保留无关项相对位置、不可变、缺 slug 静默）

放置约定：`composables/<domain>/__tests__/*.test.ts`（vitest 沿用 `__tests__/` 目录，不受 `*Policy.ts` 文件名误导）。

## Consequences

### 正面

- **重复清零**：`PRIORITIES` 5 处 → 1 处；`priorityWeight` 2 处 → 1 处；`frontier/inProgress/...` 各 1 处
- **可单测**：33 个 Vitest 用例纯函数侧，`<200ms` 跑完；CI 里跑只需 `pnpm vitest run`，不需要 mock 后端、不需要 jsdom
- **测试覆盖了不变量**：排序键突变、状态机 chain、未知优先级降级 —— 这些以前只能靠 QA 肉眼验证
- **Store 表面干净**：14 个返回值 → 11（state 2 + I/O 7 + re-export 1 + 1 个被认领的 `V3_STATUSES` 转发）；消费方不再依赖 `store.frontier`/`store.inProgress` 这种隐式派生
- **可达 React 端**：`react-app/src/services/todoService/` 未来需要等价派生时，可直接复用 `devTaskPolicy.ts` 的 JS 版本（只要 port 到 TS），无需读 Vue 组件
- **无新增副作用**：纯模块 + 改动 import 行 + 删 store 里几个 computed —— 业务行为不变

### 成本

- 多 1 个文件：`devTaskPolicy.ts`（170 行）+ 测试（360 行），但消除 ~84 行分散重复，净 -172 行 store 减负（272 → 133 行）+ 各消费者减负
- 多 1 个 `lib/date.ts`（31 行）—— 取代原来散在 store 与 panel 里的 2 段格式化
- 引入"模块级文件"这一新形态在 todo 域内 —— 现在 `composables/todo/` 里既有 `useXxx`（`useTaskDrawer`、`useDevTasks`）也有非 `useXxx` 的 `devTaskPolicy`。其语义边界由"是否返回 reactive state"区分
- React 端真正复用尚需 1 次端口（手动或 codemod），本次不做

### 风险评估

| 风险 | 评估 |
| --- | --- |
| 业务行为改变 | 无 —— 旧逻辑迁过去，单元测试覆盖了关键派生不变性 |
| 排序键偏差 | 极低 —— 5 段状态 + 4 段优先级 + 3 桶未知 全部常量集中，单测有穷举 |
| store 表面缩减影响未迁移消费方 | 已 grep 全仓；任何旧的 `store.frontier`/`store.inProgress`/`store.activeCount` 都不存在（重构前 store 也没暴露这几个） |
| `syncColumn` rollback gap | **仍存在**（独立治理项）—— 后端一条 PATCH 失败后,后续 PATCH 不会回滚已成功的几条；本次 ADR 范围只动策略提取,不修事务 |
| Badge 样式 / TaskCard 排序共享 | 未动 —— 与策略同形但跨视图组件,改动面更大,在另一次 review 决定 |
| `useDevTasks` 与 store 并存的两种状态形态 | 未动 —— 两个的 consumer set 不同(全局抽屉 vs workspace tabs),合并会损失可读性(同 ADR-0003 否决合并子 composable 的先例) |

### 拒绝的方案

**方案 A:把策略塞进 `utils/`**

拒绝理由:`utils/` 在项目里是 vendor 适配 / 图片压缩这类通用工具层(CONTEXT.md、code-style.md 均未明确但 README 把 `utils/` 归到"helper")。DevTask 策略是领域规则,放 `utils/` 会让"领域逻辑"与"vendoring"边界混淆。`composables/<domain>/` 才是 domain 归属地(已有 article/ card/ comment/ pic/ rss/ weread/ todo/ 7 个域),与 ADR-0004 之后形成的 `views/fishing/{dashboard,map,composables}/` 命名契约一致。

**方案 B:把策略做成 runtime class(模仿 FishingMapRuntime)**

拒绝理由:DevTask 策略没有 imperative 行为、没有生命周期、没有 SDK 副作用。class 形式会强迫消费者 `new Policy(tasks)` 后还要关心 dispose/reset;FishingMapRuntime 是因为要持 `map` + `ns` 引用、调 mark / planRoute 等副作用方法才需要 class。**纯函数模块更合身,测试也更直接**。

**方案 C:策略做大 class (全部塞进 store 的 returned computed)**

拒绝理由:`frontier(store.tasks)` 等 computed 暴露在 store 返回值里,会重新把消费者绑到 store 上 —— 任何想"只用策略不引 store"的场景(脚本测试、React 端 reuse、未来 CLI 工具)都拿不到。store 应**调用**纯函数,**不**容纳纯函数。

**方案 D:策略 + 测试一并搬出 frontend/**

拒绝理由:`react-app/` 还没消费这些策略;且策略的最小单元本来就贴近 Vue 模板里的 DOM-friendly 文本("P0 紧急"),跨包搬运会引入 workspace / monorepo 配置开销。YAGNI。

## 适用范围(决策要点)

> **本 ADR 确立的"纯函数模块 + barrel"模式适用于:被 2 个以上消费方复用的、无副作用的领域规则或派生。**

| 形态 | 适用场景 | 示例 | 反例 |
| --- | --- | --- | --- |
| **纯函数模块** (本 ADR) | 无副作用 / 无生命周期 / 多处复用 / 需单测 | DevTask 策略、日期格式化、文本归一 | — |
| **Composable (`useXxx`)** | 有 reactive state 需暴露给模板 | `useTaskDrawer`、`useFishingDashboard` | 纯函数 → 不该用 `useXxx` (破坏 `composables/` 名实) |
| **Runtime class** (ADR-0002) | 持外部 SDK / DOM / 副作用方法 | `FishingMapRuntime` | 无状态 → 过度设计 |
| **Port / Adapter** | 同一接口至少 2 个 adapter,或已写单测 | `CoordConverter`(AMap vs in-memory) | 1 个 adapter → ADR-0003 已删,假灵活性 |
| **Store computed** | 仅在 1 个 store 实例内有效,且派生强耦合 store state | `bentoStore.layout` 用户私有布局 | 跨 store / 跨前端复用 → 应上提为纯函数模块 |

> **新增决策时,先问 3 问:**
> 1. 有 reactive state 吗?**有** → composable 或 store。
> 2. 有 imperative 副作用 / 持有 SDK 吗?**有** → runtime class。
> 3. 既无 state 又无副作用,只是派生/规则/格式化?**是** → 纯函数模块 + barrel。
>
> 3 问都答"否"——大概率不需要新模块,合并进现有即可(参考 ADR-0003 否决过的事)。

## 实施步骤

1. 新建 `composables/todo/devTaskPolicy.ts`(纯策略)、`lib/date.ts`(日期 helper)
2. 更新 `composables/todo/index.ts` barrel
3. 改造 `stores/v3devtasks.ts`:删派生 computed、委托给纯函数
4. 改造 7 个消费方:删除内联字面量、改 import 路径
5. 新建测试 `composables/todo/__tests__/devTaskPolicy.test.ts`
6. `pnpm vitest run` 全通过(33/33 政策用例 + 整体 118/118)、`pnpm type-check` 通过

## 后续观察

如果未来出现下列需求,应当开新 ADR 而不是改本文件:

- 把 `devTaskPolicy.ts` 升格为 `shared/devtask/policy.ts`(跨 Vue/React 共享) —— 触发 workspace / monorepo 决策
- 引入"未读通知 Badge 计数" / "P0 已逾截止日" 等更复杂派生 —— 单测规模增长但仍属纯函数,叠在本文件
- 把派生挪回 store 作为 `useV3DevTaskStore().frontier` getter —— 重蹈"派生被绑死到 store"的覆辙,不要做
- `syncColumn` 引入事务式 rollback —— 独立治理项,与本 ADR 无直接依赖
