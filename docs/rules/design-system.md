# Design System

## Token Architecture

```
Layer 1: Raw tokens (oklch/hex)
  --ink, --paper, --warm-gray, --muted-text, --accent-slate, --accent-rose,
  --accent, --card-bg, --surface …

Layer 2: Theme files (per color-scheme)
  packages/brand/themes/*.css  (4 schemes × 41+ variables)
  激活方式: root element 上设 data-color-scheme="paper"
  双端共享: frontend/src/assets/base.css 与 react-app/src/assets/base.css
           都 @import '../../../packages/brand/themes/index.css'

Layer 3: Semantic tokens (Tailwind @theme inline)
  --color-background, --color-foreground, --color-primary …
  对应 Tailwind class: bg-background, text-foreground, bg-primary …
```

**规则: 只使用 Layer 3 的 Tailwind class。禁止直接引用 Layer 1 的 CSS 变量或硬编码颜色值。**

### 消费者路径

```
Layer 1 (packages/brand/themes/ 文件内 oklch/hex 原始色)
  ↓ @theme inline 桥接
Layer 2 (语义 token: --color-* 变量)
  ↓ Tailwind class 绑定
Layer 3 (Tailwind class: bg-background / bg-primary / border …)
        ↓                    ↙
  Vue / React 组件         ECharts / 图表
  (Tailwind class,         (useChartColors / useEChartsTheme,
   ~90% 用量)               resolveCssColor 读 --color-primary 等)
```

## Theme Files

主题文件位于 `packages/brand/themes/`（跨双端共享），4 个配色方案，每个 41+ 变量：

| 文件            | 风格                             | 备注              |
| --------------- | -------------------------------- | ----------------- |
| `paper.css`     | 落纸烟云（暖灰/赭/墨）           | **默认**          |
| `sage.css`      | 清隽素雅（鼠尾草/驼）            |                   |
| `mist.css`      | 烟岚氤氲（灰蓝/青/赭）           |                   |
| `blush.css`     | 桃夭未央（藕粉/陶）              |                   |

> 历史方案（sky-blue, forest-green, spring, autumn, clear-sky, midnight）已精简移除（v3.7.0）。
> 新增方案请编辑 `packages/brand/themes/` 下 CSS 文件，并在 `index.css` 注册。

## Semantic Token Reference

`base.css` 通过 Tailwind v4 `@theme inline` 把 Layer 1 变量桥接为 Layer 3 语义类。
语义 token 与 Layer 1 变量的映射（只使用 Layer 3 的 Tailwind class）：

### Surface & Text

| Tailwind class    | 映射到           | 用途               |
| ----------------- | ---------------- | ------------------ |
| `bg-background`   | `var(--paper)`   | 页面/卡片/弹窗背景 |
| `text-foreground` | `var(--ink)`     | 主文本             |
| `bg-surface`      | `var(--surface)` | 半透明浮层         |

### Primary

| Tailwind class            | 映射到                   | 用途            |
| ------------------------- | ------------------------ | --------------- |
| `bg-primary`              | `var(--accent)`          | 主按钮/强调背景 |
| `text-primary-foreground` | `var(--accent-contrast)` | 主按钮上的文字  |
| `text-primary`            | `var(--accent)`          | 强调文字        |

### Secondary / Muted

| Tailwind class              | 映射到              | 用途                            |
| --------------------------- | ------------------- | ------------------------------- |
| `bg-secondary`              | `var(--warm-gray)`  | 次要背景                        |
| `text-secondary-foreground` | `var(--ink)`        | 次要背景上的文字                |
| `bg-muted`                  | `var(--warm-gray)`  | 静默/hover 高亮背景             |
| `text-muted-foreground`     | `var(--muted-text)` | 辅助说明文字                    |

> `--warm-gray` 是中性灰 token 的来源。`bg-accent`/`text-accent-foreground` 已清理，统一用 `bg-muted`/`hover:bg-muted` 表达 hover 高亮。

### Border & Input

| Tailwind class  | 映射到                | 用途         |
| --------------- | --------------------- | ------------ |
| `border-border` | `var(--warm-gray)`    | 通用边框     |
| `border-input`  | `var(--warm-gray)`    | 表单输入边框 |
| `ring-ring`     | `var(--accent-slate)` | focus 环     |

### Semantic Status

| Tailwind class     | 映射到                     | 用途      |
| ------------------ | -------------------------- | --------- |
| `bg-destructive`   | `var(--accent-rose)`       | 危险操作  |
| `text-destructive` | `var(--accent-rose)`       | 危险文字  |
| `bg-success`       | `var(--color-emerald-500)` | 成功状态（Tailwind 默认色板） |
| `text-success`     | `var(--color-emerald-500)` | 成功文字  |
| `bg-warning`       | `var(--color-amber-500)`   | 警告/强调 |
| `text-warning`     | `var(--color-amber-500)`   | 警告文字  |

> `accent-slate/rose` 是 `ring` / `destructive` 的源，**不能删除**。`accent-sage/amber` 已清理，改用 Tailwind emerald/amber 色板。

### Chart & Gradient

| Tailwind class              | 映射到                    | 使用位置                                                          |
| --------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `bg-chart-1` … `bg-chart-5` | `--chart-1` … `--chart-5` | `BentoTech.vue`, `ChangelogView.vue`, `useChartColors` 运行时解析 |
| `gradient-primary-*`        | `--gradient-primary-*`    | 主题 bridge                                                       |
| `gradient-decorative-*`     | `--gradient-decorative-*` | 主题 bridge                                                       |

### Radius

| Token         | 值                          |
| ------------- | --------------------------- |
| `rounded-sm`  | `calc(var(--radius) - 4px)` |
| `rounded-md`  | `calc(var(--radius) - 2px)` |
| `rounded-lg`  | `var(--radius)` (0.625rem)  |
| `rounded-xl`  | `calc(var(--radius) + 4px)` |
| `rounded-2xl` | `calc(var(--radius) + 8px)` |

## Consumer Architecture

### 两套消费者对比

| 消费者                           | 读取方式                                       | 用到的变量                                                                                                                                     |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vue / React 组件**（绝大多数） | Tailwind class                                 | `foreground`/`border`/`muted-foreground`/`surface` 等                                                                                          |
| **ECharts 图表**                 | `resolveCssColor('--color-primary', fallback)` | `--color-primary` `--color-warning` `--color-foreground` `--color-muted-foreground` `--color-border` `--color-background` `--color-chart-1..5` |
| **主题切换动画**                 | 直接写 `data-color-scheme` 属性                | —（不读颜色，只切属性触发 transition）                                                                                                         |
| **明/暗模式**                    | `html.dark` class                              | 主题文件里的 `.dark` 块覆盖同名列。暗色模式必须遵循分层对比度契约：`--paper` (0.22) → `--card-bg` / `--surface` (0.28) → `--warm-gray` (0.36) → `--muted-text` (0.76) → `--ink` (0.94)，每阶 ≥5 点；`--muted-text` 必须相对 `--paper` 保持 ≥4.5:1 |

### 图表色使用 Vue

`useChartColors()` 提供 `ChartPalette` 响应式对象，涵盖两类颜色：

| 字段              | 对应 CSS 变量              | 用途                                      |
| ----------------- | -------------------------- | ----------------------------------------- |
| `primary`         | `--color-primary`          | 数据线色、标记                            |
| `warning`         | `--color-warning`          | 温度线、markLine                          |
| `foreground`      | `--color-foreground`       | 图表文字                                  |
| `mutedForeground` | `--color-muted-foreground` | 坐标轴标签、tooltip 辅助文字              |
| `border`          | `--color-border`           | 轴线、分割线、tooltip 边框                |
| `card`            | `--color-background`       | tooltip 背景                              |
| `series`          | `--color-chart-1..5`       | ECharts `color` 数组（多系列饼图/柱图等） |

`withAlpha(color, alpha)` 工具函数用于渐变 `colorStops` 中取半透明版。用法：

```ts
const { palette } = useChartColors();
const chartOption = computed(() => ({
  textStyle: { color: palette.value.foreground },
  series: [
    {
      color: palette.value.series, // 多系列
      areaStyle: {
        color: {
          type: "linear",
          colorStops: [
            { offset: 0, color: withAlpha(palette.value.series[0], 0.35) },
            { offset: 1, color: withAlpha(palette.value.series[0], 0.02) },
          ],
        },
      },
    },
  ],
}));
```

> 任何同类数据，直接在 `series[0].color` 或顶层 `color` 赋值 `palette.series`，不要硬编码 hex/oklch。
> 不要从 `localStorage` 读 `data-color-scheme` 自行解析颜色。

### 保留说明（看似低用但不可删）

- **`accent-slate/rose`** — 语义色 `ring` / `destructive` 的源头
- **`chart-1..5`** — 图表系列色，Vue 端 `useChartColors` 运行时解析
- **`gradient-*-from/to`** — `BentoRecent` / `BentoRecommend` / `ChangelogView` 引用
- **`brand-devices`** — 多组件引用的设备色
- **`@custom-variant dark`** / **`tw-animate-css`** — Tailwind / Anime 框架依赖

## Vue vs React 差异

| 维度        | Vue (`frontend/`)                                                                 | React (`react-app/`) |
| ----------- | --------------------------------------------------------------------------------- | -------------------- |
| 入口        | `src/main.ts` — Pinia + router + head                                             | `src/main.tsx` — React Router |
| UI 方案     | 自研手写组件（`@/components/ui/`），命名前缀 `UiButton` / `UiCard` / `UiModal` 等 | 无，手写组件         |
| 动画        | `motion-v` + `tw-animate-css` + CSS transition                                    | framer-motion        |
| 主题数量    | 4 个配色方案（共享 `packages/brand/themes/`）                                     | 同左（共享）         |
| 颜色格式    | oklch 为主                                                                        | oklch + hex 混用     |
| cn() 工具   | `@/lib/utils` (clsx + tailwind-merge)                                             | 无                   |
| AlertDialog | 自研 `<AlertDialog>` 基于原生 `<dialog>` + `showModal()`                          | 自定义 DialogOverlay |
| 自定义 prose | `packages/brand/prose.css`（共享）                                               | 同左（共享）         |

**API 契约修改时，两端的样式不需要同步（各自独立），但 token 名称一致。**

## 组件样式规则

### Dialog / Modal / AlertDialog

Vue 端 `UiAlertDialog` 基于原生 `<dialog>` + `showModal()` 实现，自带：

- `bg-background` 背景
- `border` + `shadow-lg` 边框和阴影
- `::backdrop` 遮罩
- 居中定位 + 浏览器级焦点陷阱 + Esc 关闭

**只需传入尺寸 class，不要覆盖背景/边框/阴影:**

```vue
<!-- 正确 -->
<AlertDialogContent class="sm:max-w-[500px]">

<!-- 错误: 覆盖组件内置的语义样式 -->
<AlertDialogContent class="border-white/[0.06] bg-black/80 backdrop-blur-2xl">
```

### 按钮

| 场景     | Vue (`UiButton`)                   | React (手动)                                                |
| -------- | ---------------------------------- | ----------------------------------------------------------- |
| 主操作   | `<UiButton>` (default variant)     | `bg-primary text-primary-foreground hover:bg-primary/90`    |
| 次要操作 | `<UiButton variant="outline">`     | `border border-border text-muted-foreground hover:bg-muted` |
| 危险操作 | `<UiButton variant="destructive">` | `bg-destructive text-white hover:bg-destructive/90`         |
| Ghost    | `<UiButton variant="ghost">`       | `hover:bg-muted`                                            |

### 半透明 Banner

需要半透明效果时，用 token + 透明度，不要硬编码:

```html
<!-- 正确 -->
<div class="bg-background/95 backdrop-blur-sm border border-border"></div>
```

## 使用建议

1. **新增组件**：永远走 Tailwind class（Layer 3），不要写 `var(--ink)`。
2. **新增配色方案**：在 `packages/brand/themes/` 下新建 `xxx.css`，在 `index.css` 中 `@import`，41+ 变量对齐。
3. **写图表色（Vue）**：用 `useChartColors()` 拿 `ChartPalette`，通过 `palette.series` 设置 ECharts 系列色、`palette.foreground` 等设置 chrome 色。React 图表暂未使用主题色，直接硬编码。
4. **加新色**：先在 Semantic Token Reference 找一个最接近语义的 token，没有再考虑新增 Layer 1 变量；新增后记得：
   - 在**所有**主题文件（`packages/brand/themes/*.css`）里都补全
   - 在双端 `base.css` `@theme inline` 里桥接成 Tailwind class
   - 在本文档 Semantic Token Reference 里登记
5. **遇到死代码**：
   - **不**要新增预留变量
   - **先全项目 grep**，再决定删除或补齐到所有主题文件

## 禁止事项

1. **硬编码颜色**: `bg-black/75`, `text-white/90`, `border-white/[0.06]`, `bg-amber-400`
2. **组件样式覆盖**: 不要用 `bg-black/80 backdrop-blur-2xl` 覆盖内置组件样式
3. **装饰性模糊光晕**: 不要添加 `pointer-events-none absolute -top-20 -right-20 bg-amber-500/8 blur-3xl` 等装饰元素
4. **跨层引用**: 不要在组件模板中直接写 `var(--ink)` 或 `var(--warm-gray)`
5. **任意 `text-white`**: 浅色模式下不可见，用 `text-foreground`

## `.impeccable/` 目录

`.impeccable/` 存在于 `frontend/`、`react-app/`、`backend/`、`go-backend/` — 这是设计系统工具(impeccable)的缓存/配置目录，不要手动编辑。生成的产物见根目录 [DESIGN.md](../DESIGN.md)。

## 新增组件检查清单

- [ ] 所有颜色使用 semantic token class，无硬编码 hex/oklch/rgba
- [ ] 边框用 `border-border` 或 `border-input`
- [ ] 文本用 `text-foreground` / `text-muted-foreground`
- [ ] 按钮用 `UiButton` variant 或对应 token class（React 端手写）
- [ ] 弹窗/对话框不覆盖内置的背景/边框/阴影
- [ ] hover 状态用 `hover:bg-muted`
- [ ] focus 状态用 `focus:ring-ring` 或 `focus-visible:border-ring`
- [ ] 浅色和深色模式下均可用（无需额外 `.dark` 覆盖）
