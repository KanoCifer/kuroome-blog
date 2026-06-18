# ADR-0004: Fishing 目录重组

## Status

Accepted

## Context

经过 ADR-0003 三轮简化后,fishing 模块文件数与质量改善明显,但**目录结构**与代码的真实结构不匹配,带来两个真问题:

### 问题 1:Map 子系统被两个目录切碎

| 文件 | 当前路径 |
|---|---|
| `MapContainer.vue` | `fishing/components/MapContainer.vue` |
| `fishingMapRuntime.ts` | `fishing/composables/fishingMapRuntime.ts` |
| `amapNamespace.ts` | `fishing/composables/amapNamespace.ts` |
| `locationResolver.ts` | `fishing/composables/locationResolver.ts` |

4 个紧密耦合的文件(改 Map 行为需要 4 处跳转),2 个目录。想理解"地图怎么工作"必须跨目录。

### 问题 2:`composables/` 名实不符

Vue 生态中 `composables/` 目录隐含的语义契约:**导出 `useXxx` 函数,返回 reactive state 给模板用**。当前 `composables/` 7 个文件里有 3 个不满足:

- `amapNamespace.ts` —— 导出 `loadAMapNamespace()` 工厂函数(单例模式,无 reactive state)
- `locationResolver.ts` —— 导出纯函数 `resolveCurrentPosition`(无 reactive state)
- `fishingMapRuntime.ts` —— 导出一个 class `FishingMapRuntime`(无 reactive state)

新人进 `composables/` 默认期待 `useXxx`,看到 `class FishingMapRuntime` 会困惑。

### 为什么不动 components/

`components/` 7 个文件虽然在"业务类型"上分 3 类(框架 / Map / tile),但都是 dashboard 内的视觉组件,共享同一套设计 token、DashboardCard chrome。QuickFeedbackBanner / FeedbackFormDialog / AnalysisDrawer 散乱分类(tiles/ 是伪概念,见"拒绝的方案")。

**判断**:把 components/ 再细分(dashboard/ + tiles/)是审美诉求,不动业务也不会更慢,且会引入"chrome 和 tile 谁算 dashboard 框架"的边界争议。**留 components/ 不动**。

### 为什么不动 fishingMapRuntime 的形式

ADR-0003 决策已经判定 runtime 是"纯 imperative 行为 + 内部状态"的最优形态(class),不动。

## Decision

执行**最小重组**(4 文件搬家 + 7 文件 import 更新):

### 新结构

```
fishing/
├── FishingMapView.vue              (不动)
├── map/                            ← 新增,Map 子系统内聚
│   ├── MapContainer.vue
│   ├── fishingMapRuntime.ts
│   ├── amapNamespace.ts
│   └── locationResolver.ts
├── components/                     ← 不动(7 个视觉组件)
│   ├── DashboardCard.vue
│   ├── DashboardHeader.vue
│   ├── IndexHeroCard.vue
│   ├── HourlyChartCard.vue
│   ├── QuickFeedbackBanner.vue
│   ├── FeedbackFormDialog.vue
│   └── AnalysisDrawer.vue
└── composables/                    ← 只剩 4 个真 composable
    ├── useFishingDashboard.ts
    ├── useFishingRoute.ts
    ├── useFishingFeedback.ts
    └── useFishingAnalysis.ts
```

### 文件移动

| 源路径 | 目标路径 |
|---|---|
| `components/MapContainer.vue` | `map/MapContainer.vue` |
| `composables/fishingMapRuntime.ts` | `map/fishingMapRuntime.ts` |
| `composables/amapNamespace.ts` | `map/amapNamespace.ts` |
| `composables/locationResolver.ts` | `map/locationResolver.ts` |

### Import 更新

| 文件 | 更新 |
|---|---|
| `FishingMapView.vue` | `components/MapContainer` → `map/MapContainer` |
| `map/MapContainer.vue` | `composables/{amapNamespace,fishingMapRuntime,useFishingRoute}` → 同目录或 `../composables/...` |
| `map/fishingMapRuntime.ts` | `composables/locationResolver` → 同目录 / `composables/useFishingRoute` → `../composables/useFishingRoute` |
| `map/locationResolver.ts` | 无外部依赖 |
| `map/amapNamespace.ts` | 取 `AMapWithPlugins` 类型 → `../composables/fishingMapRuntime`? 实际:在 `map/fishingMapRuntime.ts` 内 |
| `composables/useFishingDashboard.ts` | 不变,只引同目录 composables |
| `composables/useFishingRoute.ts` | 不动 |
| `composables/useFishingFeedback.ts` | 不变 |
| `composables/useFishingAnalysis.ts` | 不变 |

**实际细节**: `AMapWithPlugins` 类型定义在 `fishingMapRuntime.ts`,`amapNamespace.ts` 需要引用。把 `AMapWithPlugins` 从 `fishingMapRuntime.ts` 抽到 `amapNamespace.ts` 更合理(谁拥有 SDK 类型,谁就该导出)。具体见实施步骤 4。

### 命名保持

不重命名任何文件 —— 文件名 (fishingMapRuntime / amapNamespace / locationResolver) 已准确描述其职责,移动不改名。

## Consequences

### 正面

- **Map 子系统内聚**:4 文件同目录,改地图行为聚焦
- **composables/ 名实相符**:进入即 useXxx,符合 Vue 生态默认约定
- **路径自带上下文**:`@/views/fishing/map/MapContainer` 比 `@/views/fishing/components/MapContainer` 更明确"这是地图子系统组件,不是普通组件"
- **跟项目惯例对齐**:`frontend/src/components/map/TideCard.vue` + `WeatherCard.vue` 已把"地图相关"放 `components/map/`,fishing 内部 `map/` 是对称延伸
- **改造量最小**:4 文件 mv + 7 文件 import 字符串更新,无业务逻辑改动

### 成本

- 跨目录 import 路径略长,但 composables/ 内反而更短(同目录 useXxx 互相引)
- 目录数 +1(3 → 4)
- Git 视为 delete + create,失去对移动文件的 blame 连续性(可用 `git log --follow` 恢复)

### 风险评估

| 风险 | 评估 |
|---|---|
| 业务行为改变 | 无 —— 只改路径,不动代码 |
| 类型破坏 | 极低 —— import 字符串更新由 vue-tsc 验证 |
| 循环依赖 | 风险上升 —— 需验证不形成环(map/ 不引 composables/ 的 useXxx,composables/ 不引 map/) |
| 跨目录可见性 | `composables/useFishingDashboard` 不直接引 map/*,只有 `map/MapContainer` 和 `FishingMapView` 引 map/。单向依赖,清晰 |

### 拒绝的方案

**方案 A:按子系统分目录(完整版)**

把 dashboard/(框架)+ tiles/(5 个 tile)+ map/ 都分出来。

拒绝理由:
- tiles/ 是伪概念(QuickFeedbackBanner 不是 tile,FeedbackFormDialog 不是 tile,AnalysisDrawer 不是 tile)
- dashboard/ 与 tiles/ 边界不客观(DashboardHeader 算框架还是 layout?)
- 改造面 2 倍(动 10+ 文件),收益只是审美

**方案 B:按职责类型分层**

views/ + components/ + services/ + composables/ 严格分层。

拒绝理由:
- **破坏 Map 内聚** —— 想读 Map 工作机制要跨 views/MapContainer + services/fishingMapRuntime + services/amapNamespace 三个目录
- 引入 services/ 概念但项目里无先例
- 4 + 3 + 4 + 4 = 15 文件分布到 4 目录,每目录更散

## 实施步骤

1. `mkdir fishing/map`
2. `git mv` 4 文件到 map/
3. 抽出 `AMapWithPlugins` 类型从 `fishingMapRuntime.ts` 到 `amapNamespace.ts`(谁拥有 SDK 谁导出)
4. 更新 7 个文件的 import 路径
5. `cd frontend && pnpm run type-check` + `pnpm run lint` 验证

## 后续观察

如果未来出现"fishing 之外复用 MapContainer"的需求:

- 把 `fishing/map/` 升格为 `frontend/src/modules/map/` 或 `frontend/src/shared/map/`
- 不必现在为不存在的复用做抽象(ADR-0003 刚拆掉的"假灵活性"坑)

## 实施后续:`components/` 改名为 `dashboard/`

落地后审计发现 `components/` 命名仍误导 —— 它是 fishing 私有 dashboard 部件,但与全局 `frontend/src/components/` 视觉混淆(后者才是真正的全局共享组件库)。已执行 7 文件 mv,4 文件 import 更新(零业务改动,零 router 改动)。命名前后对比:

| 之前 | 之后 |
|---|---|
| `fishing/components/DashboardCard.vue` | `fishing/dashboard/DashboardCard.vue` |
| `@/views/fishing/components/...` | `@/views/fishing/dashboard/...` |

现在 fishing 内部 3 个目录语义自解释:

- **`dashboard/`** —— 7 个 fishing 私有 dashboard 视觉部件
- **`composables/`** —— 4 个 `useXxx` 响应式状态聚合
- **`map/`** —— 4 个地图子系统文件,Map 行为完整闭环

参考社区共识(Markus Oberlehner、Vue School、Nazar Boyko):"按业务/领域,不要按类型";`components/` 是"按类型"命名,适合全局共享组件,不适合模块内部部件。fishing 已经形成独立子系统,内部用更精确的 `dashboard/` 是对齐社区最佳实践的最小改动。
