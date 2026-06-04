# Design System

## Token Architecture

三层结构，每层不可跨级使用：

```
Layer 1: Raw tokens (oklch/hex)
  --ink, --paper, --warm-gray, --muted, --accent-amber, --accent-sage,
  --accent-slate, --accent-rose, --workspace-accent, --card-bg, --surface ...

Layer 2: Theme files (per color-scheme)
  frontend/src/assets/themes/*.css   (10 schemes)
  react-app/src/assets/themes/*.css  (6 schemes)
  激活方式: root element 上设 data-color-scheme="sky-blue"

Layer 3: Semantic tokens (Tailwind @theme inline)
  --color-background, --color-foreground, --color-card, --color-primary ...
  对应 Tailwind class: bg-background, text-foreground, bg-card, bg-primary ...
```

**规则: 只使用 Layer 3 的 Tailwind class。禁止直接引用 Layer 1 的 CSS 变量或硬编码颜色值。**

## Semantic Token Reference

### Surface & Text

| Tailwind class            | 映射到                      | 用途          |
| ------------------------- | --------------------------- | ------------- |
| `bg-background`           | `var(--paper)`              | 页面背景      |
| `text-foreground`         | `var(--ink)`                | 主文本        |
| `bg-card`                 | `var(--card-bg)`            | 卡片/弹窗背景 |
| `text-card-foreground`    | `var(--ink)`                | 卡片内文本    |
| `bg-surface`              | `var(--surface)`            | 半透明浮层    |
| `text-surface-foreground` | `var(--surface-foreground)` | 浮层文本      |

### Primary & Accent

| Tailwind class            | 映射到                             | 用途            |
| ------------------------- | ---------------------------------- | --------------- |
| `bg-primary`              | `var(--workspace-accent)`          | 主按钮/强调背景 |
| `text-primary-foreground` | `var(--workspace-accent-contrast)` | 主按钮上的文字  |
| `text-primary`            | `var(--workspace-accent)`          | 强调文字        |

### Secondary / Muted / Accent

| Tailwind class              | 映射到             | 用途             |
| --------------------------- | ------------------ | ---------------- |
| `bg-secondary`              | `var(--warm-gray)` | 次要背景         |
| `text-secondary-foreground` | `var(--ink)`       | 次要背景上的文字 |
| `bg-muted`                  | `var(--warm-gray)` | 静默背景         |
| `text-muted-foreground`     | `var(--muted)`     | 辅助说明文字     |
| `bg-accent`                 | `var(--warm-gray)` | hover 高亮背景   |
| `text-accent-foreground`    | `var(--ink)`       | hover 高亮文字   |

### Border & Input

| Tailwind class  | 映射到                | 用途         |
| --------------- | --------------------- | ------------ |
| `border-border` | `var(--warm-gray)`    | 通用边框     |
| `border-input`  | `var(--warm-gray)`    | 表单输入边框 |
| `ring-ring`     | `var(--accent-slate)` | focus 环     |

### Semantic Status

| Tailwind class     | 映射到                | 用途      |
| ------------------ | --------------------- | --------- |
| `bg-destructive`   | `var(--accent-rose)`  | 危险操作  |
| `text-destructive` | `var(--accent-rose)`  | 危险文字  |
| `bg-success`       | `var(--accent-sage)`  | 成功状态  |
| `text-success`     | `var(--accent-sage)`  | 成功文字  |
| `bg-warning`       | `var(--accent-amber)` | 警告/强调 |
| `text-warning`     | `var(--accent-amber)` | 警告文字  |

### Radius

| Token         | 值                          |
| ------------- | --------------------------- |
| `rounded-sm`  | `calc(var(--radius) - 4px)` |
| `rounded-md`  | `calc(var(--radius) - 2px)` |
| `rounded-lg`  | `var(--radius)` (0.625rem)  |
| `rounded-xl`  | `calc(var(--radius) + 4px)` |
| `rounded-2xl` | `calc(var(--radius) + 8px)` |

## Vue vs React 差异

| 维度        | Vue (`frontend/`)                     | React (`react-app/`) |
| ----------- | ------------------------------------- | -------------------- |
| UI 库       | shadcn-vue (New York style)           | 无，手写组件         |
| 动画        | reka-ui 内置 + CSS transition         | framer-motion        |
| 主题数量    | 10 个配色方案                         | 6 个配色方案         |
| 颜色格式    | oklch 为主                            | oklch + hex 混用     |
| cn() 工具   | `@/lib/utils` (clsx + tailwind-merge) | 无                   |
| AlertDialog | shadcn AlertDialog 组件               | 自定义 DialogOverlay |

**API 契约修改时，两端的样式不需要同步（各自独立），但 token 名称一致。**

## 组件样式规则

### Dialog / Modal / AlertDialog

Vue 端使用 shadcn AlertDialog 时，`AlertDialogContent` 已自带:

- `bg-background` 背景
- `border` + `shadow-lg` 边框和阴影
- open/close zoom + fade 动画
- 居中定位 + overlay

**只需传入尺寸 class，不要覆盖背景/边框/阴影:**

```vue
<!-- 正确 -->
<AlertDialogContent class="sm:max-w-[500px]">

<!-- 错误: 覆盖了 shadcn 的语义样式 -->
<AlertDialogContent class="border-white/[0.06] bg-black/80 backdrop-blur-2xl">
```

### 按钮

使用 shadcn Button variants (Vue) 或对应 token class:

| 场景     | Vue (shadcn)                     | React (手动)                                                 |
| -------- | -------------------------------- | ------------------------------------------------------------ |
| 主操作   | `<Button>` (default variant)     | `bg-primary text-primary-foreground hover:bg-primary/90`     |
| 次要操作 | `<Button variant="outline">`     | `border border-border text-muted-foreground hover:bg-accent` |
| 危险操作 | `<Button variant="destructive">` | `bg-destructive text-white hover:bg-destructive/90`          |
| Ghost    | `<Button variant="ghost">`       | `hover:bg-accent hover:text-accent-foreground`               |

### 半透明 Banner

需要半透明效果时，用 token + 透明度，不要硬编码:

```vue
<!-- 正确 -->
<div class="bg-card/95 backdrop-blur-sm border border-border">

<!-- 错误 -->
<div class="bg-black/75 backdrop-blur-2xl border-white/[0.06]">
```

## 禁止事项

1. **硬编码颜色**: `bg-black/75`, `text-white/90`, `border-white/[0.06]`, `bg-amber-400`
2. **Glassmorphism 覆盖**: 不要用 `bg-black/80 backdrop-blur-2xl` 覆盖 shadcn 组件
3. **装饰性模糊光晕**: 不要添加 `pointer-events-none absolute -top-20 -right-20 bg-amber-500/8 blur-3xl` 等装饰元素
4. **跨层引用**: 不要在组件模板中直接写 `var(--ink)` 或 `var(--warm-gray)`
5. **任意 `text-white`**: 浅色模式下不可见，用 `text-foreground` 或 `text-card-foreground`

## 新增组件检查清单

- [ ] 所有颜色使用 semantic token class，无硬编码 hex/oklch/rgba
- [ ] 边框用 `border-border` 或 `border-input`
- [ ] 文本用 `text-foreground` / `text-muted-foreground` / `text-card-foreground`
- [ ] 按钮用 shadcn variants 或对应 token class
- [ ] 弹窗/对话框不覆盖 shadcn 默认的背景/边框/阴影
- [ ] hover 状态用 `hover:bg-accent hover:text-accent-foreground`
- [ ] focus 状态用 `focus:ring-ring` 或 `focus-visible:border-ring`
- [ ] 浅色和深色模式下均可用（无需额外 `.dark` 覆盖）
