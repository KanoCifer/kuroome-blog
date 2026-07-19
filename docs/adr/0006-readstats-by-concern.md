# ADR-0006: readStats by-concern 拆分

## Status

Accepted

## Context

`frontend/src/stores/readStats.ts` 在首版合并了三个无关的领域:

| 领域                    | 状态量                                                                                                                                                                   | I/O                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Snapshots**(本意)     | `snapshots` map + `currentByMode` + `weeklySnapshot` + `monthlySnapshot` + 别名 3 条 + `readStatItems` + `preferAuthors` + `preferPublishers` + `readListenRatio`(10 键) | `fetchCurrentAll` / `fetchPeriod` / `getSnapshot` |
| **YearlyHeatmap**(寄生) | `yearlyHeatmap` + `yearlyHeatmapYear` + `isLoadingYearlyHeatmap` + `yearlyHeatmapError`(4 键)                                                                            | `fetchYearlyHeatmap`                              |
| **Recommends**(寄生)    | `recommends` + `isLoadingRecommends` + `recommendError` + `recommendMaxIdx` + `hasMoreRecommends`(5 键)                                                                  | `fetchRecommends`                                 |
| 共用                    | `isLoading` + `error`(1 个共享 loading + 1 个共享 error)                                                                                                                 | —                                                 |
| **合计**                | **20 个 ref/computed + 7 个函数 = 27 个 returned key**                                                                                                                   |                                                   |

这三个领域除了"都从 wereadGateway 拿数据"外没有共同语义,但被强制放进同一个 Pinia store,带来三类真问题:

### 问题 1:loading flag 串扰

`BookStats.vue` 上的 `StatsRefreshFooter` 用 `statsStore.isLoading` 控制 footer spinner;`BookShelf.vue` 的推荐 rail 用 `statsStore.isLoadingRecommends` 控制 rail spinner;`isLoading` 是**同一** ref。结果:推荐 rail 在 fetch 时,BookStats 的 footer 也会闪一下 spinner,反之亦然 —— 视觉上看不出"哪一类数据在等响应"。

### 问题 2:god store 把别处无法不引 god

`BentoReadingList.vue:71` 只想读 `weeklySnapshot.totalReadTime` 和 `monthlySnapshot.totalReadTime` 两个数字,却要 `import { useReadStatsStore }` 拿到整个 247 行模块、`store.snapshots` / `store.isLoading` / `store.error` / `store.yearlyHeatmap` 等无关响应式 ref 全都在订阅链上 — 该组件没有任何理由关心 yearlyHeatmap 缓存或推荐游标。

### 问题 3:派生规则与 I/O 耦合

`recommendMaxIdx` 推进规则(`searchIdx > 0` 用 lastIdx、否则 `maxIdx + length`)+ dedup by bookId 是纯逻辑,但埋在了 god store 的 `fetchRecommends` 内部;没法独立单测,只能 mock gateway 起一个 Pinia 然后调函数。推荐的 cursor 推进一直是 QA 肉眼看不出错的盲区。

### 为什么 snapshots 不该跟 heatmap/recs 一起

Snapshots 是 **collection state** —— 4 mode × 任意 baseTime 的大量只读缓存,跨组件订阅(8 个 sibling composables 都吃它),适合 Pinia。Heatmap 是 **per-year cache** —— 只有 1 个消费者 (`BookStats.vue`),它的 isLoading/viewYear 是 view-private,适合 module 单例 composable。Recommends 是 **cursor + dedup + append** —— 同样的"1 个消费者 + view-private 写入",也适合 composable。两者的形态契约和消费半径完全不同于 snapshots,合并是"装在同一文件里的方便",代价被所有人承担。

## Decision

按 3 模块拆分 + god store 一次性收缩 + 💀 警示注释防回归,具体如下:

### 1. 新建 `frontend/src/composables/weread/useHeatmap.ts`

module 单例,与 `useTaskDrawer` / `useWereadShelf` 同形态。从原 store 1:1 复制 `fetchYearlyHeatmap` 逻辑 + 4 个 ref。

```ts
const yearlyHeatmap = ref<Record<number, Record<string, number>>>({});
const yearlyHeatmapYear = ref<number | null>(null);
const isLoadingYearlyHeatmap = ref(false);
const yearlyHeatmapError = ref("");

export function useHeatmap() {
  async function fetchYearlyHeatmap(year?: number): Promise<void> {
    /* ... */
  }
  return {
    yearlyHeatmap,
    yearlyHeatmapYear,
    isLoadingYearlyHeatmap,
    yearlyHeatmapError,
    fetchYearlyHeatmap,
  };
}
```

### 2. 新建 `frontend/src/composables/weread/useRecommends.ts`

module 单例,同形态。保留 cursor 推进 + dedup + reset 续取逻辑(原 `stores/readStats.ts:158–197` 1:1 搬迁),5 个 ref + 1 函数。

### 3. `composables/weread/index.ts` barrel 添加 2 行

### 4. `stores/readStats.ts` 一次性收缩

247 行 → ~110 行:

| 删                                                                                                      | 保留                                                        |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `yearlyHeatmap*` (4 ref + 函数) → 迁 useHeatmap                                                         | `snapshots` ref                                             |
| `recommend*` (5 ref + 函数) → 迁 useRecommends                                                          | `isLoading` + `error`(专属于 snapshot fetch)                |
| `snapshotByMode` / `currentSnapshots` 别名(2 ref,等同一个 `Object.values`)                              | `currentByMode` / `weeklySnapshot` / `monthlySnapshot` 派生 |
| `readStatItems` / `preferAuthors` / `preferPublishers` / `readListenRatio`(4 computed,只 weekly 重导出) | `fetchCurrentAll` / `fetchPeriod` / `getSnapshot`           |

**顶层加 💀 警示注释**:

```ts
// 💀 This store is now thin — 仅保留 snapshot(I/O),其他领域已迁出:
//   - yearlyHeatmap + fetchYearlyHeatmap → @/composables/weread/useHeatmap
//   - recommends + fetchRecommends       → @/composables/weread/useRecommends
// 新增 weread feature 时请进 composables/weread/,不要回到这个 store。
```

### 5. 3 个 view 消费者改 import

| 文件                                                   | 改造                                                                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `views/books/BookShelf.vue:123,153–158,161–166`        | 删 `statsStore.fetchRecommends/recommends/isLoadingRecommends/hasMoreRecommends/recommendError`,改 `useRecommends()` |
| `views/books/BookStats.vue:241,269–284,311,323–334`    | 同上 + `statsStore.yearlyHeatmap/...` 改 `useHeatmap().yearlyHeatmap/fetchYearlyHeatmap`                             |
| `views/entry/components/BentoReadingList.vue:71,75–78` | **不动** —— 只读 `weeklySnapshot/monthlySnapshot/fetchCurrentAll`,全是 snapshot 本职                                 |

### 6. 测试

| 文件                                                 | 覆盖                                                                                                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `composables/weread/__tests__/useHeatmap.test.ts`    | 初始空、fetch 成功 + per-year cache、默认年份、缓存命中跳过网络、isLoading 互斥、失败写 error、多份年份并存 (7 用例)                                     |
| `composables/weread/__tests__/useRecommends.test.ts` | reset/续取/dedup/cursor 推进/空响应关 hasMore/响应不足关 hasMore/hasMore=false 后 no-op/isLoading 互斥/gateway data=null 抛错/失败保旧数据 (10 用例)     |
| `stores/__tests__/readStats.test.ts`                 | 初始派生、fetchCurrentAll 4 mode 并发 + 部分失败、isLoading 流程、fetchPeriod 指定 baseTime、getSnapshot 缓存命中、data=null 抛错、异常保旧数据 (9 用例) |

### 7. 迁移时序

3 步(composables → views → store):

- 0. 写 useHeatmap / useRecommends + composable 测试
- 1. 改 BookShelf.vue 与 BookStats.vue 的 import,跑 type-check
- 2. 收缩 god store + 写 store 测试,跑全套

无中间状态双 store 过渡。

## Consequences

### 正面

- **3 个 loading flag 各管各的** —— `BookStats.vue` 的 footer 不会因为推荐 fetch 而闪;recommends 失败时 footer 不空转
- **`BentoReadingList.vue` 与 `BookShelf.vue` 各取所需** —— Bento 不再因订阅 useReadStatsStore 的全 27 键在内存中被"轻量重渲"
- **`useRecommends` cursor + dedup 10 个 vitest 用例纯逻辑覆盖** —— 优于之前只能 mount view + mock gateway 的端到端测试
- **deletion test 通过** —— 删 `useRecommends` 不影响 snapshot;删 `useHeatmap` 不影响 BookShelf;删 snapshots store 仍保留两个 composable 可独立存活
- **💀 注释显式让维护者知道"为什么 god store 不该重新变胖"** —— 这是对抗"无规则下 store 必然越来越胖"的核心机制

### 成本

- 新增 2 个文件(~110 行 + 测试 ~190 行)
- god store 净 -137 行(247 → 110)
- view 改造面 2/3(`BookShelf.vue` + `BookStats.vue` 各改 import;Bento 不动)
- 形态契约新增一条"module 单例 composable 用于 view-private 状态",与 ADR-0005 的"纯函数模块"并列,需文档化(见"适用范围"一节)

### 风险评估

| 风险                                                    | 评估                                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 业务行为改变                                            | 无 —— `fetchYearlyHeatmap` / `fetchRecommends` / `fetchCurrentAll` / `fetchPeriod` 各 1:1 搬迁,view 引用表面等价替换 |
| Bento 渲染性能                                          | 提升 —— 之前 BentoReadingList 的 store-store 引用会让所有内部 ref 都在依赖图里,迁移后只剩 snapshot 派生              |
| useSnapshotsStore 仍大                                  | 但 `snapshots` map 是 collection state —— 8 个 sibling composables 都吃它,放 store 是最简单契约                      |
| React 端 `react-app/src/stores/readStatsStore.ts` 同步? | 不动 —— 是不同 store、不同 seam。本 ADR 是 Vue 域单点改造;React 同形 god store 留作单独 ticket                       |
| God store 💀 注释被忽略                                 | 与 ESLint warning 类似 —— 维护者自觉;若有人无视,执行 step 4 即写入 ADR-0006 历史                                     |

### 拒绝的方案

**方案 A:把 useHeatmap / useRecommends 都塞进 store 内的 sub-store 块**

拒绝理由:无显式 seam,组件要靠"知道 store 内部命名空间"才能用上,deletion test 不通过(删 sub-store 块 store 不在概念上能独立存活);同时跟 ADR-0002 黄金参考的"port + 适配器"形态偏离 —— `useHeatmap` 完全没有 SDK 副作用,放 store 里是过度抽象。

**方案 B:合并 useHeatmap + useRecommends 为 1 个 `useReadStatsSidecars`**

拒绝理由:`BookStats.vue` 仅要 heatmap、`BookShelf.vue` 仅要 recommends —— 强行打包要 view 各自 import 后"假装不调另一半函数";且新 god store 仍是 god monorepo,只是规模减半,问题 1/2/3 仍部分存在。

**方案 C:god store 完全删除,所有三个域都变 composable**

拒绝理由:8 个 sibling composables (`useRhythmView` / `useOverviewView` / ...) 都从 `getSnapshot` 拿数据;snapshots 是 collection state 不是 single-instance,封装为 module 单例 composable 会让"多个 section 同时订阅同一快照"的语义变模糊(`useSnapshots()` 在每个 section 内调用得到的是引用同一份 ref 还是各自副本?需新增 contract 沟通)。保持 Pinia store 是最小变动。

## 适用范围(决策要点)

> **本 ADR 确立的 "useXxx composable 替 store 持有 view-private 状态" 模式适用于:**

| 形态                          | 适用场景                                                             | 示例                                                              | 反例                                                 |
| ----------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| **useXxx composable**(本 ADR) | view-private 状态 + 单一消费者 + module 单例足够 + 无 SDK/DOM 副作用 | `useHeatmap`、`useRecommends`、`useTaskDrawer`、`useWereadShelf`  | 跨多 view 共享 + collection state → 走 store         |
| **Pinia store**               | cross-view 共享 + collection state + 派生态复杂                      | `useReadStatsStore` 削后剩余的 7 键、article counter、card layout | 单 view 私有的开关 → 走 composable                   |
| **Runtime class**(ADR-0002)   | 持外部 SDK / DOM 副作用 / imperative 行为                            | `FishingMapRuntime`                                               | 无 SDK/DOM → 走 composable 或纯函数模块(ADR-0005)    |
| **Port / Adapter**            | 同一接口 ≥ 2 个 adapter 或已写单测                                   | `CoordConverter`、`wereadGateway`                                 | 1 个 adapter 且无第二消费者 → ADR-0003 已删,假灵活性 |
| **Pure 模块**(ADR-0005)       | 无 reactive state 的派生/规则/格式化                                 | `devTaskPolicy.ts`、`lib/date.ts`                                 | 需要 reactive state → 走 composable 或 store         |

> **3 问决策清单**(沿用 ADR-0005,补 view-private 这一分支):

1. 有 reactive state 吗?**有** → 进入 2。
2. 跨多 view 共享 + 是 collection state?**是** → store。**否 + view-private** → `useXxx` composable。
3. 有 imperative SDK/DOM 副作用?**有** → runtime class。**无** → composable 或纯模块。

## 实施步骤

1. 新建 `composables/weread/useHeatmap.ts` 与 `useRecommends.ts`
2. 更新 `composables/weread/index.ts` barrel
3. 写 `composables/weread/__tests__/{useHeatmap,useRecommends}.test.ts` 与 `stores/__tests__/readStats.test.ts`
4. 改 `views/books/BookShelf.vue` 与 `BookStats.vue` 的 import
5. 一次性收缩 `stores/readStats.ts`,加 💀 注释
6. `pnpm vitest run` 全通过(≥ 26 新用例 + 历史) · `pnpm type-check` · `pnpm run lint`

## 后续观察

如果未来出现下列需求,应当开新 ADR 而不是改本文件:

- **React 端 god store 同步拆分** —— 独立治理项,与本 ADR 平行
- **god store 💀 注释被无视,store 重新变胖** —— 直接 snapshot `useReadStatsStore` 的 returned key 数量到 CI / 写新 ADR
- **snapshots 域再分** — 未来若引入 5th mode(比如 daily),需要重新评估 `currentByMode` 是否仍合理;但当前 4 mode 不值得再拆
- **多家 store 都出现 💀 但被无视** —— 应反思 god-store-detector heuristic 是否需要工具化(自定义 ESLint rule / codemod)
