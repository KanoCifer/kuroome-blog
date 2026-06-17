# Theme Variables Usage Guide

> 配套 [design-system.md](design-system.md)。本文档聚焦 `frontend/src/assets/themes/*.css`
> 和 `react-app/src/assets/themes/*.css` 中 **45 → 36 个 CSS 变量**的实际使用情况、分类、
> 活跃度，以及 2026-06 死代码清理记录。

## 1. 主题文件总览

`frontend/src/assets/themes/` 与 `react-app/src/assets/themes/` **结构完全对齐**（10 文件 × 41 变量），
由各自 `index.css` 一并 `@import` 到 `base.css`：

| 文件                  | 变量数 | 风格                       |
| --------------------- | ------ | -------------------------- |
| `sky-blue.css`        | 41     | 默认 · 高远澄澈（蓝/靛）   |
| `forest-green.css`    | 41     | 林深时见（绿/青/苔）       |
| `paper.css`           | 41     | 落纸烟云（暖灰/赭/墨）     |
| `sage.css`            | 41     | 清隽素雅（鼠尾草/驼）      |
| `mist.css`            | 41     | 烟岚氤氲（灰蓝/青/赭）     |
| `blush.css`           | 41     | 桃夭未央（藕粉/陶）        |
| `spring.css`          | 41     | 万物生发（青绿/橙黄）      |
| `autumn.css`          | 41     | 橙黄橘绿（朱/黄/蓝）       |
| `clear-sky.css`       | 41     | 晴空（青蓝/鹅黄/白）       |
| `midnight.css`        | 41     | 深夜（深靛，1 色 accent）  |

> **历史**：2026-06 清理前，`paper / sage / mist / blush` 额外定义了 5 个变量（46 vs 41）：
> `--status-active` / `--status-cooling` / `--status-abandoned` /
> `--workspace-accent-soft` / `--workspace-accent-border`。
> 经全项目 0 引用扫描后已对齐到 41，**所有 10 个主题结构完全一致**。

## 2. 变量分类与活跃度

`base.css` 通过 Tailwind v4 `@theme inline` 把 Layer 1 变量桥接为 Layer 3 语义类
（`bg-primary` / `text-foreground` / `border-border` …）。

### 2.1 Surface & Text（页面底色/正文）

| 变量                   | 被引用次数 | 桥接到 Tailwind           | 实际使用位置                            |
| ---------------------- | ---------- | ------------------------- | --------------------------------------- |
| `--paper`              | 23         | `bg-background`           | 主题内 bridge + `useChartColors`        |
| `--ink`                | 118        | `text-foreground`         | **最高频**，所有主题文件互相引用         |
| `--warm-gray`          | 118        | `border-border` 等        | 同上，作为中性灰骨架                     |
| `--card-bg`            | 46         | `bg-card`                 | 卡片/弹窗背景                           |
| `--surface`            | 1          | `bg-surface`              | 半透明浮层                              |
| `--surface-foreground` | 1          | `text-surface-foreground` | 浮层文字                                |

### 2.2 Primary / Workspace Accent（强调色）

| 变量                          | 被引用次数 | 桥接 Tailwind              | 备注                                       |
| ----------------------------- | ---------- | -------------------------- | ------------------------------------------ |
| `--workspace-accent`          | 25         | `bg-primary`               | 主操作/强调背景（也作 `text-primary`）     |
| `--workspace-accent-contrast` | 25         | `text-primary-foreground`  | 主按钮上的文字                             |

### 2.3 Accent 色（语义状态/装饰）

| 变量             | 被引用次数 | 桥接 Tailwind            | 实际使用                              |
| ---------------- | ---------- | ------------------------ | ------------------------------------- |
| `--accent-amber` | 0          | 映射到 `warning`         | 仅 `useChartColors` 间接使用          |
| `--accent-sage`  | 0          | 映射到 `success`         | 同上                                  |
| `--accent-slate` | 0          | 映射到 `ring`            | focus 环；CSS bridge `var(--ring)`    |
| `--accent-rose`  | 0          | 映射到 `destructive`     | 危险操作；CSS bridge `var(--destructive)` |
| `--muted`        | 8          | `bg-muted`               | 静默背景 — 但**未被任何主题定义**     |

> 实际写入 `var(--accent-rose)` / `var(--accent-sage)` / `var(--accent-amber)` /
> `var(--accent-slate)` 的代码 0 处 — 它们只在每个 theme 文件**内部**通过
> `var(--workspace-accent)` 等间接消费，未被组件直接读。

### 2.4 图表与渐变

| 变量                          | 引用次数 | 桥接 Tailwind              | 实际使用                                |
| ----------------------------- | -------- | -------------------------- | --------------------------------------- |
| `--chart-1` ~ `--chart-5`     | 7        | `bg-chart-1` …             | `BentoTech.vue`/`ChangelogView.vue` 等 |
| `--gradient-primary-from`     | 1        | `from-gradient-primary-from` | 主题自身 bridge 使用                    |
| `--gradient-primary-to`       | 1        | `to-gradient-primary-to`   | 同上                                    |
| `--gradient-decorative-from`  | 1        | `from-gradient-decorative-from` | 同上                                |
| `--gradient-decorative-to`    | 1        | `to-gradient-decorative-to` | 同上                                  |
| `--radius`                    | 7        | `rounded-{sm,md,lg,xl,2xl}` | 全局圆角基线（0.625rem）                |

### 2.5 中性辅助

| 变量           | 引用次数 | 桥接 Tailwind            | 实际使用              |
| -------------- | -------- | ------------------------ | --------------------- |
| `--muted-text` | 23       | `text-muted-foreground`  | 辅助说明文字          |

## 3. 消费层（谁在读这些变量）

```
┌────────────────────────────────────────────────────────────────────┐
│  Layer 1 (theme 文件内 oklch/hex 原始色)                            │
│    ↓ bridge 内部 var()                                              │
│  Layer 2 (shadcn 语义 token: --background / --primary / --border…) │
│    ↓ @theme inline                                                   │
│  Layer 3 (Tailwind class: bg-background / bg-primary / border…)    │
└────────────────────────────────────────────────────────────────────┘
                                    ↓
              ┌─────────────────────┴──────────────────────┐
              ↓                                            ↓
   Vue / React 组件                                     ECharts / 图表
   bg-primary / text-foreground                        useChartColors.ts
   border-border / bg-card                             useEChartsTheme.ts
   (主路径，~90% 用量)                                  (resolveCssColor 读
                                                       --color-primary 等)
```

**两套消费者对比：**

| 消费者                       | 读取方式                                                    | 用到的变量                                                              |
| ---------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Vue / React 组件**（绝大多数） | Tailwind class                                         | `primary`/`foreground`/`border`/`muted-foreground`/`card`/`surface` 等 |
| **ECharts 图表**             | `resolveCssColor('--color-primary', fallback)`              | `--color-primary` `--color-success` `--color-warning` `--color-destructive` `--color-foreground` `--color-muted-foreground` `--color-border` `--color-card` `--color-muted` |
| **主题切换动画**             | 直接写 `data-color-scheme` 属性                              | —（不读颜色，只切属性触发 transition）                                  |
| **明/暗模式**                | `html.dark` class                                           | 主题文件里的 `.dark` 块覆盖同名列                                        |

## 4. 2026-06 死代码清理记录

清理前：`base.css` 408 行 + 4 个主题各多 5 个变量。
清理后：`base.css` 290 行（−118 行） + 4 个主题对齐到 41 变量。
**全项目 0 视觉变化、0 行为变化**（仅 `vue-tsc` / `tsc` 与 `eslint` 通过验证）。

### 4.1 已删除的 `@theme` / `@theme inline` 项

| 删除项                                       | 原因                                          |
| -------------------------------------------- | --------------------------------------------- |
| `--color-brand-books`                        | 全局零引用                                     |
| `--color-sidebar` 及 6 个 `--color-sidebar-*` | 注释自称 "shadcn compat, not used in app"     |
| `--animate-bounce-up` / `bounce-up` keyframe | 0 引用                                         |
| `--animate-scale-easeOutElastic` / 整个 keyframe | 0 引用                                     |
| `--animate-dot-pulse` / `dot-pulse` keyframe | 0 引用                                         |
| `--animate-timer-ping` / `timer-ping` keyframe | 0 引用                                       |
| `--animate-shimmer` / `shimmer` keyframe     | 0 引用（react-app 中曾定义过两个 `shimmer` keyframe，已合并删除）|
| `.animate-shimmer` 自定义类                  | 0 引用                                         |
| `.modal` / `.modal-body` 规则               | 0 引用                                         |

### 4.2 已删除的 `.prose pre code` 冗余

| 删除项                                      | 原因                                |
| ------------------------------------------- | ----------------------------------- |
| `display: block; background: transparent; border: none;` | Tailwind Typography 插件默认值，重复 |

### 4.3 已删除的主题变量（4 个文件 × 5 变量 = 20 处）

`paper / sage / mist / blush`（每个 light + dark 块各 5 个）：
- `--workspace-accent-soft`
- `--workspace-accent-border`
- `--status-active`
- `--status-cooling`
- `--status-abandoned`

**所有 10 个主题文件现统一为 41 变量，结构对齐**。

## 5. 保留（看似没用但实际有用）

- **4 个 font-family** — `theme.ts` 通过 `data-font="harmonyos"` 切换；alibaba/dongfang/averia 同样在 `@theme` 中定义供未来使用
- **`accent-amber/sage/slate/rose`** — 是 shadcn `destructive/success/warning/ring` 的源头，**不能删**
- **`chart-1..5`** — 7 处 Tailwind class 引用（`BentoTech.vue`, `ChangelogView.vue`），活跃
- **`gradient-*-from/to`** — `BentoRecent.vue`, `BentoRecommend.vue`, `ChangelogView.vue` 引用，活跃
- **`brand-devices`** — 6+ 组件引用，活跃
- **`@custom-variant dark`** / **`tw-animate-css`** — Tailwind / Anime 框架依赖

## 6. 使用建议

1. **新增组件**：永远走 Tailwind class（Layer 3），不要写 `var(--ink)`。
2. **新增配色方案**：复制 `sky-blue.css` 改 41 个变量即可。
3. **写图表色**：用 `useChartColors()` 拿 `ChartPalette`，不要从 `localStorage` 读 `data-color-scheme` 自行解析。
4. **加新色**：先在 §2 找一个最接近语义的 token，没有再考虑新增 Layer 1 变量；新增后记得：
   - 在 10 个主题文件里都补全
   - 在 `base.css` `@theme inline` 里桥接成 Tailwind class
   - 在本文档 §2 里登记
5. **遇到死代码**：
   - **不**要新增预留变量 — 历史上 `status-active/cooling/abandoned` 4 个主题有、6 个没有，11 个月 0 引用，最后只能清理
   - **先全项目 grep**，再决定删除或补齐到 10 文件

## 7. 一句话总结

> 41 个变量（清理后）全部活跃。Tailwind class 是消费主路径（~90%），ECharts
> 通过 `useChartColors` / `useEChartsTheme` 间接读语义色。Layer 1 的 `accent-*` /
> `chart-*` 看似 0 直引，实际是 shadcn token 的源头，**不能删**。
