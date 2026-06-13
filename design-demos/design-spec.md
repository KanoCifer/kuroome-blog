# FishingMap · iPhone 设计 Spec

> 改造对象: `react-app/src/views/FishingMap/FishingMap.tsx` 及其子组件
> 目标设备: iPhone 14/15/16 (393×852pt, safe area top 59pt / bottom 34pt)
> 副目标: iPhone SE (375×667pt)、iPhone 16 Pro Max (430×932pt) 不破
> 框架: React 19 + framer-motion + Tailwind 4 + zustand + echarts
> 设计令牌: 全部用 semantic token (`bg-card`, `text-foreground`, `border-border` …), 禁止硬编码颜色

---

## 1. 现状摘要（理解后才改）

| 元素              | 当前位置                | 移动端问题                                                                 |
| ----------------- | ----------------------- | -------------------------------------------------------------------------- |
| `FishingDashboardHeader` | 顶部 sticky         | OK, 但「AI 分析」按钮只 32px, 没到 44pt                                   |
| `FishingMapTile`  | 主区第 1 张卡, h-46dvh  | 占据屏一半, 下面 4 张卡要滑 3-4 屏才看全; 路线规划提示气泡与地图 marker 抢视觉 |
| `FishingIndexCard` | 主区第 2 张卡          | 三个 metrics + 9 项 features 用 `<details>` 折叠, 信息量过载; 反馈按钮独占一行 |
| `WeatherCard`     | 主区第 3 张卡           | 4 项气象指标 (风/湿/压/态) 横排, icon + label + value 三层, 小屏挤; 3 日预报图标偏小 |
| `TideCard`        | 主区第 4 张卡           | 港口 + 日期两个 `<select>` 是浏览器原生样式, iOS 上又丑又难点; 高低潮标签混在 chart 旁 |
| `HourlyWeather`   | 主区第 5 张卡           | 双 y 轴图表, 移动屏宽 360pt 下 x 轴文字重叠; 图例「降水量/温度」两个 pill 占横向空间 |
| `QuickFeedbackBanner` | 顶部反馈横幅       | OK, 简短                                                                 |
| `FishingAnalysisDrawer` | 右侧抽屉 (420px / 90vw) | iPhone 上 90vw 整张屏都被占了, 没有 drag handle 拖关; close X 32px 偏小 |
| `FishingFeedbackForm` | 居中 modal         | iOS 习惯是 bottom sheet; 5 个反馈按钮 3 列网格, 38px 高度偏挤              |
| `AIAnalysisWidget`  | 既嵌在 drawer 又 portal 浮层 | 浮层模式「FAB + 居中弹层」, 与 drawer 模式视觉不一致, 移动端不必要保留两套 |

## 2. 设计目标

1. **iPhone 优先**: 393pt 宽为基准屏, 关键触摸目标 ≥ 44×44pt, 顶部 status bar 59pt, 底部 home indicator 34pt
2. **单手可达**: 核心操作 (定位 / 反馈 / AI 分析) 全部落在屏幕底部 1/2 区域
3. **滑动友好**: 内容纵向滚动, 不再需要横向滑 (除了潮汐日期/港口 chip)
4. **地图可全屏**: 主区第 1 张卡可一键放大到全屏, 看清楚水系和 marker
5. **iOS 原生手势**: bottom sheet 拖下关闭、卡片滑动操作 (左滑反馈)
6. **视觉一致**: 只用 semantic token, 不留硬编码颜色和装饰性 blur 光晕

## 3. 信息架构重排

```
┌──────────────────────────────┐  ← 顶 0
│ Status Bar (44pt)            │
│ ┌─ Sticky Header (56pt) ──┐  │
│ │ 钓鱼地图  • kanocifer  🤖 │  ← tap → AI Bottom Sheet
│ └────────────────────────────┘  │
│                              │  ← 主区, 滚动
│ ┌─ Map Card (240pt) ───────┐  │
│ │ [A           📍]         │  │
│ │ [M   ·m   route]         │  │
│ │ [P  pin  📍  浮层]        │  │
│ │ [⛶ 全屏]    [📍 定位]    │  │  ← 两个浮按钮 (≥44pt)
│ └──────────────────────────┘  │
│ ┌─ QuickFeedback (条件) ──┐  │  ← 钓完反馈入口, 仅在没规划路线时显示
│ │ 钓完了？反馈今日指数 →   │  │
│ └──────────────────────────┘  │
│ ┌─ Index Card ─────────────┐  │  ← 钓鱼指数 (核心)
│ │ 87   爆护                │  │
│ │ 3 个 metric pill         │  │
│ │ [详情 →] [反馈]          │  │
│ └──────────────────────────┘  │
│ ┌─ Weather Card ───────────┐  │  ← 实时天气
│ │ 📍 地点   24° 晴 ☀️       │  │
│ │ 体感 22°  能见 15km       │  │
│ │ 风 3m/s  湿 65%  压 1012  │  │
│ │ [今天 26°/19°] [明天] […] │  │
│ └──────────────────────────┘  │
│ ┌─ Tide Card ──────────────┐  │  ← 潮汐
│ │ [港口 ▾]  [06-13 周五 ▾]  │  │
│ │ [    潮高曲线 (12h)     ]  │  │
│ │ 最高 18:24  ↗ 2.4m        │  │
│ │ 最低 02:15  ↘ 0.3m        │  │
│ └──────────────────────────┘  │
│ ┌─ Hourly Card ────────────┐  │  ← 24h 趋势
│ │ 降水量 ▌  温度 ▌           │  │
│ │ [    双 y 轴图 (14h)   ]  │  │
│ └──────────────────────────┘  │
│  在出钓与阅读之间, 留一片安静   │
│                              │
│ Home Indicator (34pt)        │
└──────────────────────────────┘  ← 底 852
```

主屏**不再有底部 tab bar**——因为只有一个主屏, tab bar 没意义; 改用地图卡内的浮按钮承担"定位"和"全屏", AI 分析在 header。

## 4. 关键改动清单

### 4.1 `FishingMapTile` —— 移动端
- 高度从 `h-46dvh` 缩到 `h-[240pt]`, 让首屏可看完地图 + 至少 1 张卡
- 浮按钮: 右上「⛶ 全屏」/ 左下「📍 定位」各 ≥44pt, 半透明卡片背板
- 路线规划气泡贴底留 8pt (避 home indicator)
- 加 props `onFullscreen`, 由父级控制全屏覆盖层

### 4.2 `FishingIndexCard` —— 移动端
- 大数字 + 等级一行, 不再叠加 metric 三列
- metric 三个小 pill 横排 (默认权重 / 残差 / 综合), 字号 11px
- 「特征详情」改成点开后 **跳到底部 sheet** (`FishingIndexDetailSheet`), 9 项 feature 排成 2 列网格
- 反馈按钮: 主操作 → 满宽 primary, 副操作「特征详情」→ outline

### 4.3 `WeatherCard` —— 移动端
- 头部一行: 📍 地点名 + 温度 + 天气 icon + 文字
- 体感/能见度 2 列 → 保留
- 4 项气象指标 (风/湿/压/态) → 改成 2x2 网格, 标签在外、值在里
- 3 日预报 → 横向 scroll chip (today / +1 / +2 / +4 / +7), 每 chip 44pt 高

### 4.4 `TideCard` —— 移动端
- 港口 + 日期两个 native `<select>` → 改成 **iOS Segmented Control 风格 chip**:
  - 港口: 横向 scroll chip (黄埔港 / 大亚湾 / 舟山 …), 单选
  - 日期: 横向 scroll chip (今天 / 明天 / +2 / … / +7), 单选
- chart 高度: `h-[180pt]` 而非 `h-[200pt]`, 留 12pt 上下 padding
- 高低潮数据 2 列保留, 字号略缩

### 4.5 `HourlyWeather` —— 移动端
- 标题区两个 legend pill → 简化为单行 inline: `▌降水量  ▌温度`
- 图表 x 轴间隔 (`interval = max(1, n/5)`) 改为按屏宽动态算, 避免文字重叠
- 高度 `h-[180pt]`

### 4.6 `FishingAnalysisDrawer` —— 移动端变 bottom sheet
- 移动端 (< sm): bottom sheet, `inset-x-0 bottom-0`, `h-[88dvh]`, 顶部 drag handle, 下滑关闭
- 桌面端 (≥ sm): 保持右侧抽屉 420px
- 共用同一组件, props 加 `variant?: 'sheet' | 'drawer'`
- close 按钮 ≥ 44pt

### 4.7 `FishingFeedbackForm` —— 移动端变 bottom sheet
- 移动端: bottom sheet (同 drawer 风格), `inset-x-0 bottom-0`, 顶部 drag handle
- 桌面端: 居中 modal
- 5 个反馈按钮: 移动端 5 列, 每按钮 ≥ 44pt 高

### 4.8 `QuickFeedbackBanner` —— 不动
- 已经够紧凑, 唯一调: 主按钮 ≥ 44pt 高

### 4.9 `FishingDashboardHeader` —— 移动端
- AI 分析按钮 tap 区域扩到 ≥ 44pt (现在 px-3 py-1.5 = 30pt, 加 py-2.5)

## 5. 设计令牌与样式

**只用 semantic token, 不引新色**:

| 场景                | Token                                                          |
| ------------------- | -------------------------------------------------------------- |
| 卡片底              | `bg-card` / `border-border/40`                                  |
| 半透明浮层 (sheet)  | `bg-card/95 backdrop-blur-sm`                                  |
| 主按钮              | `bg-primary text-primary-foreground`                            |
| 次按钮              | `border border-border text-foreground hover:bg-accent`          |
| 反馈等级色          | `text-success / text-primary / text-warning / text-destructive / text-muted-foreground` (沿用现有 LEVEL_COLORS) |
| Drag handle         | `bg-muted-foreground/40` (手柄小棒)                             |

**间距**:
- 卡片间 `space-y-3` (12pt), 卡片内 `p-4` (16pt)
- 触摸目标最小 44pt, 大按钮 48pt
- 圆角 `rounded-2xl` (16pt) for cards, `rounded-full` for chips/buttons

**字号**:
- 指数大数字 `text-5xl` (48pt) — 不变
- 卡片标题 `text-sm font-semibold`
- 卡片副标题 `text-xs text-muted-foreground`
- 数值 `text-sm font-bold tabular-nums`
- 触摸按钮文字 ≥ `text-sm`

**安全区**:
- Header 顶部用 `pt-[env(safe-area-inset-top)]` 间接由 sticky 处理
- Sheet/drawer 底部用 `pb-[env(safe-area-inset-bottom)]` 加 `mb-[34pt]` for home indicator

## 6. 动效

- 卡片进入: `motion` y+12 → 0, 0.4s, ease `[0.22, 1, 0.36, 1]` — 沿用现有
- Bottom sheet 上下: `y: 100% → 0`, 0.3s, 同上 ease
- Drag handle 下拉关闭: 用 framer-motion `drag="y"` + `dragConstraints` + `onDragEnd` 触发关闭
- 反馈按钮 tap: `active:scale-[0.97]` 0.1s
- AI 分析抽屉打开: 同现有 cubic-bezier

## 7. 不在范围

- 不动 AMap 地图本身 (是外部库)
- 不动后端 API 和 zustand store
- 不重做数据流 (hooks 继续返回原结构)
- 不动「vite.config / tailwind / 设计系统 token 本身」
- 不动 Vue 端 `frontend/`, 因为是「双前端独立」架构

## 8. 验收

- `pnpm run type-check` 通过 (tsc -b)
- 在 iPhone 15 viewport (393×852) 测:
  - 首屏可见: 头部 + 地图 + Index 卡标题 + 至少半个 Weather 卡
  - 所有可点元素 ≥ 44pt
  - Bottom sheet 可上下拖动
- 桌面 (≥ 640pt) 仍能正常用右侧抽屉 + 居中 modal
- 浅色 / 深色 / 6 套配色方案都不破
