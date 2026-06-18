# ADR-0003: Fishing 模块简化

## Status

Accepted

## Context

ADR-0002 落定钓鱼模块的"深模块 / 端口与适配器"架构后,实际工程体验出现偏差:
- 用户反馈"嵌套太多,看着晕"
- 整个 `frontend/` 目录 `__tests__/` 不存在,0 个 `.spec.ts`/`.test.ts`(确认方式:`find frontend -name '*.spec.ts' -o -name '*.test.ts'`)
- 由此,ADR-0002 中标注为"测试端口"的 `AMapEngine` / `CoordConverter` 等抽象,**实际没有任何测试在用**
- 抽象成本(阅读链路过长、文件碎片化)却由所有维护者承担

典型"call chain 过长"场景(用户从 dashboard 跟到 AMap 的"我在哪"调用):

```
useFishingDashboard.onMapReady:64
  → map.getCurrentPosition()              // template ref
    → MapContainer.vue:289-292 (defineExpose)
      → FishingMapRuntime.getCurrentPosition:185
        → resolveCurrentPosition(this.converter)  // locationResolver.ts:42
          → converter.locateByIp() | converter.fromGps()
            → createAmapConverter  // fishingMapRuntime.ts:51
              → AMap SDK
```

5 跳,中间还有 `AMapEngine` 端口(实为 `{ map, ns }` 二字段包装,无任何行为差异)与 `createAmapConverter` 工厂(实为 `CoordConverter` 接口的唯一实现)。

## Decision

执行以下 4 项简化(**不**重写业务逻辑,**不**改变对外行为):

### 1. 删除 `frontend/src/views/fishing/composables/amapTypes.ts`

- `DrivingService` / `CitySearchService` 折叠进 `fishingMapRuntime.ts`(8 行)
- `AMapWithPlugins` 移到 `fishingMapRuntime.ts` 顶部
- `Window._AMapSecurityConfig` / `AMap` 全局声明移至 `MapContainer.vue` 自身(它才是设置 `securityJsCode` 的地方)

### 2. 删除 `AMapEngine` 端口

构造签名从 `new FishingMapRuntime({ map, ns })` 改为 `new FishingMapRuntime(map, ns)`。

理由:`AMapEngine` 只是 `{ map, ns }` 两字段透传,`FishingMapRuntime` 内部仍直接 `this.engine.ns.Marker(...)` —— **端口屏蔽了"传什么",但屏蔽不了"怎么用"**。没有测试 = 没有收益。

### 3. 把 `createAmapConverter` 内联进 `FishingMapRuntime`

```ts
class FishingMapRuntime {
  private readonly converter: CoordConverter = {
    fromGps: (lng, lat) => /* 委托 ns.convertFrom */,
    locateByIp: () => /* 委托 ns.CitySearch */,
  };
}
```

保留 `CoordConverter` 接口(在 `locationResolver.ts` 中,因为 `resolveCurrentPosition` 才是它真正的消费者,定位回退链是真业务)。

### 4. 拍平 `useFishingDashboard` 返回值

模板里 `dash.route.isPlanning.value` 改为 `dash.isPlanning.value`:

```ts
return {
  // refs (顶层)
  mapTileRef,
  fishingSpots,
  activeLocation,
  indexData,
  isPlanning: route.isPlanning,        // ← 拍平
  routeInfo: route.routeInfo,          // ← 拍平
  feedbackOpen: feedback.open,         // ← 拍平
  currentFishingData: feedback.currentFishingData,  // ← 拍平
  feedbackLocationId: feedback.locationId,
  feedbackLocationName: feedback.locationName,
  analysisOpen: analysis.open,         // ← 拍平
  analysisPayload: analysis.payload,   // ← 拍平
  analysisHasData: analysis.hasData,
  // handlers
  onMarkerClick, onClearRoute, onFeedbackClick, onQuickFeedback,
  onMapReady, onMapError, init, refreshIndex,
  // 仍然保留子 composable 引用 (handlers 内部按需用)
  route, feedback, analysis,
};
```

模板里 `dash.route.isPlanning.value` 改为 `dash.isPlanning.value`;`dash.feedback.open.value` 改为 `dash.feedbackOpen.value` 等等。

`route` / `feedback` / `analysis` 仍保留在返回值中,因为 dashboard 内部 handlers 需要直接调用 `route.planFromMarker` / `feedback.openFeedback` —— 但模板里**不**再走子 composable。

## Consequences

### 正面

- 文件:`composables/` 7 → 6,行数 755 → ~620
- 模板里最常访问的 4 个 ref 少一层点链(从 3 段 `dash.route.isPlanning.value` 降到 2 段 `dash.isPlanning.value`)
- 5 跳的"我在哪"调用链降为 4 跳,中间不再有"工厂造适配器"
- 抽象与现实对齐:留下的 `CoordConverter` 是真有业务逻辑,删掉的 `AMapEngine` 是空头支票

### 实施后追记:AMap namespace hoist

落地时发现 `MapContainer.onMounted` 里 `fetchSecurityKey + AMapLoader.load` 每次 mount 都跑一遍。已 hoist 到新增的 `composables/amapNamespace.ts`:`loadAMapNamespace()` 内部用 `let nsPromise: Promise | null` 缓存,整个 app 生命周期只 fetch 1 次 + load 1 次。

判断依据:
- `AMapLoader.load()` 对 namespace 幂等(loader 内部 state machine),但 plugin 数组合并仍触发网络
- 全项目目前仅 MapContainer 一个 AMap 消费者,无第二张地图,namespace 单例安全
- `AMap.Map` 实例**不可** hoist(1:1 绑 DOM container,AMap API 不支持换皮),仍由组件持有并 `destroy()`

新文件 55 行,MapContainer 减 41 行(324 → 283)。`composables/` 7 → 7(净 +1 文件,+~25 行)。

### 成本

- `MapContainer.vue` 多几行类型声明(`Window._AMapSecurityConfig` 移过去)
- dashboard 返回值行数增加(8 个新 ref 别名),但都是机械拍平

### 风险评估

| 风险 | 评估 |
|---|---|
| 失去未来可测试性 | 0 — `FishingMapRuntime` 即便能注入 engine,内部仍 `new ns.Marker(...)`,**没有 AMap mock 仍然测不了**;`CoordConverter` 保留 |
| 类型破坏 | 极低 — 所有类型仍在,只换文件位置 |
| 跨文件引用断 | 检查范围:`MapContainer.vue` 引 `AMapWithPlugins`,引 `FishingMapRuntime`/`AMapEngine` |
| 业务行为改变 | 无 |

### 不在本 ADR 范围

- 三个子 composable(`useFishingRoute` / `useFishingFeedback` / `useFishingAnalysis`)的合并 — 经验证(ADR-0002 审计)各自有真实状态,合并会损失可读性
- `useFishingRoute(() => mapTileRef.value)` lambda 写法 — 替换为直接传 ref 是横向移动,无收益
- 拍平后仍保留 `dash.route` / `dash.feedback` / `dash.analysis` 给 handlers 内部用 — 仅消除**模板**的嵌套

## 实施步骤

1. 折叠 `amapTypes.ts` 内容到 `fishingMapRuntime.ts` / `MapContainer.vue`
2. `FishingMapRuntime` 构造签名改为 `(map, ns)`,内联 `createAmapConverter`
3. 拍平 `useFishingDashboard` 返回值
4. 同步 `MapContainer.vue` 与 `FishingMapView.vue` 模板
5. `cd frontend && pnpm run type-check` + `pnpm run lint` 验证

## 后续观察

如果未来真要补单测:

- `LocationResolver` 是最先能测的(纯逻辑 + 注入 `CoordConverter` mock)
- `FishingMapRuntime` 需要 AMap 的 JSDOM/headless 方案,优先级低
- 子 composable 单测需要先决定测什么行为(目前行为跨 store + runtime,边界模糊)
