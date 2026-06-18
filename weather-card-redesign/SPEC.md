# Weather Cards Redesign · Design Spec

> 输出目标：3 套差异化视觉方向，并排给用户看；选完再把代码迁回 .vue 重构文件。
> 范围：`frontend/src/views/fishing/dashboard/WeatherCard.vue`（Map 上的实时天气卡）+ `frontend/src/views/fishing/dashboard/HourlyChartCard.vue`（Dashboard 里的 24h 折线/柱状图）。
> 注：原文件位于 `frontend/src/components/map/WeatherCard.vue` 与 `frontend/src/views/fishing/components/HourlyChartCard.vue`,已在 fishing 目录重组(ADR-0004)中迁移到 `views/fishing/dashboard/`。
> 基调关键词：**天气的诗意 / 氛围感** —— 让数据卡从"工程面板"变成"看一眼就能感受到此刻天气的卡片"。

---

## 1. 产品上下文

ReadingList（kanocifer.chat）是个人阅读追踪 + 钓鱼地图博客系统。Fishing Dashboard 是核心场景之一，用户打开后第一眼看到的是"适不适合现在出发钓鱼"的判断。天气 + 24h 趋势是判断的两个核心数据。

**当前问题（用户已隐含的痛点）**：
- 现有两张卡"信息密度高但氛围感为零"——是 Dashboard 里所有卡中**最无表情的两张**。
- 大数字 + 三联指标 + 4 天预览 + 折线图，全部走工程感语言（Tailwind `bg-muted/40` 方块、tabular-nums、`qi-*` icon font）。
- 跟旁边 Hero 钓鱼指数卡（已经做了 hero-glow / hero-sweep / 渐变描边 / rounded-2xl 悬停变换）相比，这两张卡显得**过于朴素**，节奏不一致。
- 24h 折线图：当前是双轴 echarts（降水柱+温度线），信息密度可以，但**没有天气叙事**——只看得到数字趋势，看不到"今天下午 3 点会下雨"那种直觉。

**重构目标**：
- 让两张卡**有自己的角色**——`WeatherCard` 是"此刻的天"，`HourlyChartCard` 是"接下来 24h 的天空"。
- 整体走「**气象诗意**」——温度数字成为情绪锚点、配色跟随当前天气状态微变、留白节奏更舒展。
- 仍然尊重项目设计系统（10 个主题、semantic token、不破坏其他卡片）。

---

## 2. 目标用户与使用场景

- **目标用户**：个人垂钓爱好者，熟悉和风天气 API 字段，关注风力/气压/温度/降水。
- **使用场景**：
  1. 打开 Dashboard 一眼决定"今天出不出门"——这一眼要看到温度大数字 + 一个"现在窗外大概什么样"的氛围提示。
  2. 决定出门后，看 24h 趋势卡确认"几点下雨、几点起风、几点最适合"——这一眼要能在 3 秒内识别"关键转折点"。
- **观众距离**：1m 笔记本屏幕看 dashboard，10cm 手机看 map 上的悬浮卡。
- **情感基调**：安静、有呼吸感、像翻一本写天气的小册子。**不**要做成「炫技 dashboard」。

---

## 3. 内容要点（必现的元素）

### 3.1 WeatherCard（实时天气卡）
- 地点名（来自 `locationName`，可能为 "钓鱼地点" 占位）
- 数据来源标注（"和风天气"）
- 天气 icon（`qi-{icon}` 类，已存在；fallback 是 cloud SVG）
- 当前温度（大数字 + °C）
- 天气文字描述（`text` 字段：晴/多云/小雨/雷阵雨…）
- 三联指标：风向 / 风力（级）/ 湿度（%）
- 未来 3-4 天简版预览（日期、icon、最高/最低温）
- "更新于 {时间}" 脚注
- 点击整张卡 → 打开和风天气
- 状态：loading / error / empty / ok 四态

### 3.2 HourlyChartCard（24h 趋势卡）
- 标题"小时天气预报" + 副标"未来 24 小时"
- 图例：降水（柱）+ 温度（线）
- 24 个数据点（每小时 1 个：温度 + 降水量）
- 关键时段的视觉强调（雨峰、高温点、最低温度点）
- tooltip（hover 时显示该时段的温度/降水）
- 状态：loading / empty

---

## 4. 视觉系统约束（必须遵守）

### 4.1 设计 token（项目已有，不许硬编码）
所有颜色必须使用 Tailwind semantic class：
- `bg-card` / `bg-background` / `bg-muted` / `bg-primary` / `bg-accent` / `bg-destructive` / `bg-success` / `bg-warning`
- `text-foreground` / `text-muted-foreground` / `text-primary-foreground` / `text-card-foreground` / `text-success` / `text-warning` / `text-destructive`
- `border-border` / `border-input` / `border-border/40`
- 圆角 `rounded-2xl` / `rounded-3xl` / `rounded-xl` / `rounded-lg`

### 4.2 禁止事项（来自项目 design-system.md）
- ❌ 硬编码颜色（`bg-black/75` / `text-white/90` / `border-white/[0.06]` / `bg-amber-400`）
- ❌ Glassmorphism 覆盖（`backdrop-blur-2xl` 不能覆盖 shadcn）
- ❌ 装饰性模糊光晕（`pointer-events-none absolute -top-20 -right-20 ... blur-3xl`）
- ❌ 跨层引用（`var(--ink)` / `var(--warm-gray)`）
- ❌ 浅色模式下用 `text-white`

### 4.3 必含
- ✅ 暗色 / 浅色模式都可用（用 `data-color-scheme` 切换 theme，不要 `.dark` 手写）
- ✅ `DashboardCard` 作为 chrome wrapper（tone="default" / "hero" / interactive）—— 三个 subagent 都可以决定是否升 hero tone
- ✅ `qi-{icon}` 字体图标保留（项目已有依赖）
- ✅ 三态：错误、加载、空态都要有合理视觉

### 4.4 字体
- 走项目 font 体系，**不要引入新字体**（避免破坏 design system 一致性）。
- 可以用 `font-serif` 营造诗意氛围（参考 `DashboardHeader.vue` 里的 `font-family-averia` 写法）。
- 数字用 `tabular-nums`（保持工程感的数字对齐）。

### 4.5 动画
- 可以用 motion-v 做小幅度入场（fade-up 8px、stagger 80ms）。
- hover 走 `DashboardCard` 自带浮起。
- 数字可以加 tabular-nums + 简单的数值变化过渡（不要每秒抖动）。
- ❌ 不要做炫技的粒子动画、3D 旋转。

---

## 5. 三套差异化方向（subagent 各自独立做一版）

### 方向 A · 气象诗集（poetic-meteorology）
- **气质关键词**：写给朋友的一页天气日记 / 文学感 / 留白
- **设计语言**：
  - 标题用 `font-serif italic`，主温度数字巨大（`text-7xl` ~ `text-8xl`），单位 °C 极小极轻
  - 天气文字描述放最上面一句（"今天薄云转晴"），温度放下面，像句子
  - 未来 4 天用"日期"+"icon"+"最高/最低"三栏极简版，每栏之间用细 `border-border/40` 分隔而不是 `bg-muted/40` 方块
  - 整体留白显著增加，padding 从 `p-6` 升级到接近 `p-8`，元素之间 `space-y-6`
  - 三联指标去掉方块背景，改成"风向 东南 风"水平的 inline 文本
  - 配色走 `text-foreground` + `text-muted-foreground` + 单一 `text-primary` 强调（温度数字可以走一个微妙的 `text-warning` 或 `text-primary`，让数字"暖"起来）
  - 暗色模式同样成立
- **24h 折线图（HourlyChartCard）**：
  - 改 echarts 风格：去掉网格、去掉双轴文字，保留双轴但用极细 dashed line
  - 降水柱用 `bg-primary/60`，温度线用 `text-warning`
  - 在雨峰时段加一个 `bg-primary/20` 的极浅背景条，标记"预计降水"
  - 在最高/最低温点旁加 serif 极小数字注释

### 方向 B · 桌面气象站（desktop-station）
- **气质关键词**：克制数据屏 / 衬线大字 + 无衬线小字 / 等宽数字 / 像 macOS 天气 app 的去娱乐化版本
- **设计语言**：
  - 顶部一行 metadata（地点 + "和风天气 · 更新于 HH:MM"）走极小 `text-xs text-muted-foreground uppercase tracking-[0.2em]`
  - 主温度用 `text-6xl font-light tabular-nums`，紧跟 `°C` 同样 light
  - 天气文字描述 + icon 横排放右上，icon 大尺寸走 `text-4xl` 跟温度数字的"重力"对位
  - 三联指标做成"读数条"：左是 label（小字），右是值（中等字），下面细 `border-border/40` 分隔线
  - 未来 4 天用 horizontal scroll 或 grid 3-4 栏，每栏温度曲线用 SVG 微小 sparkline 替代 echarts 太重的"折线图"（但这张卡是 HourlyChartCard 自己的事，下面单独说）
  - 配色走纯 `text-foreground` + `text-muted-foreground` + `text-primary` 强调；**不**用 `text-warning` 等彩色（保留工程感）
  - 整体结构非常"克制 + 节奏清晰"，适合长时间盯盘的用户
- **24h 折线图（HourlyChartCard）**：
  - 维持 echarts 双轴，但 x 轴每 3h 一个标签，y 轴去掉次要刻度
  - 温度线节点用 `symbol: 'circle'` 默认显示（不是 hover 才显示），直径 3px，颜色 `text-warning`
  - 降水柱用 `bg-primary/40` 极轻
  - 顶部 legend 删掉，把降水/温度说明嵌到 y 轴 label 上

### 方向 C · 天空剧场（sky-theater）
- **气质关键词**：氛围感最强 / 配色跟随当前天气 / 单一英雄元素 / 像 iOS 天气 app 的"此刻"卡
- **设计语言**：
  - WeatherCard tone 升到 `hero`（带 hero-glow 渐变描边 + hero-sweep 扫光）
  - **关键差异**：根据当前 `liveWeather.text` / `icon` 状态，主区背景用一个**极轻的语义色淡背景**（如晴 → `bg-warning/8` 暖调；雨 → `bg-primary/10` 冷调；云 → `bg-muted/30` 灰调）——但所有色值走 semantic token + opacity modifier，不硬编码
  - 主温度数字 `text-7xl font-bold tabular-nums`，单位 `°C` 走 `text-foreground/60` 极轻
  - 天气文字描述用大号 `text-lg font-medium`，是"句子"不是"标签"
  - 三联指标做成"水平 metric row"，每项之间用极细竖线 `border-r border-border/30` 分隔（无背景色块）
  - 未来 4 天用 grid 4 栏，每栏 icon 走大号 `text-3xl`、日期 `text-xs uppercase`、温度用 `text-foreground` + `text-muted-foreground`（max 暖 / min 灰）
  - 加载/错误/空态都做成"夜空"质感的占位
- **24h 折线图（HourlyChartCard）**：
  - tone 升 `hero`（加 hero-glow 描边）
  - echarts 背景透明、grid 极淡、tooltip 卡片用 `bg-card/95 border-border shadow-lg`（不要覆盖成黑色）
  - 在最高/最低温度点加 motion-v 动画入场（fade-up 8px stagger 60ms）
  - 降水柱用 `bg-primary` 渐变（from primary/80 to primary/30），让"下雨"看起来有水的层次

---

## 6. 输出格式与尺寸（subagent 必须严格遵守）

- **单 HTML 文件**，双击可在浏览器打开
- **视口尺寸**：1440×900（标准桌面 dashboard 视角）
- **关键布局**：横向并排两个 card 区域，左 `WeatherCard`（约 380px 宽）、右 `HourlyChartCard`（约 720px 宽），中间 `gap-6`；整体在页面里"假装"是 dashboard 中的一行
- **背景**：用一个极淡的 `bg-background` 或主题默认 `paper` 模拟 dashboard 背景
- **主题**：用 sky-blue（项目默认），但确保暗色模式（通过模拟 data-color-scheme="midnight"）下也成立 —— 可以做两组并排（浅 + 深）展示
- **必须包含的 HTML 内容**：
  - 一个**模拟 WeatherCard**，里面塞**真实的和风天气字段**（不要 Lorem）：
    - locationName: "闽江口·竹岐"
    - text: "多云转小雨"
    - icon: "100" 或 "305" 之类的真实 icon code（直接写 class `qi-100`，不依赖加载）
    - temp: "22"
    - windDir: "东南风"
    - windScale: "3"
    - humidity: "78"
    - obsTime: "2026-06-18 14:30:00"
    - forecasts: 4 个，写死几个真实值（如 06-19 多云 27/22，06-20 小雨 24/20，06-21 雷阵雨 26/22，06-22 多云 28/23）
  - 一个**模拟 HourlyChartCard**，里面塞 24 个真实数据点（不要 Lorem）：
    - x 轴 14:00 → 次日 13:00
    - 温度从 22°C 升到 28°C 下午高峰，夜里回落到 24°C，早上回升
    - 降水在 18:00 / 21:00 / 02:00 / 09:00 有几根小柱（2-5mm）
- **不**要引入任何 npm/CDN 依赖 —— echarts 用真实 echarts CDN（`https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js`）以便渲染图表
- **三版输出文件**：
  - `weather-card-redesign/demos/A-poetic-meteorology.html`
  - `weather-card-redesign/demos/B-desktop-station.html`
  - `weather-card-redesign/demos/C-sky-theater.html`
  - 配套一个 `weather-card-redesign/demos/index.html` 把三版用 iframe 并排展示

---

## 7. 自检清单（每个 subagent 交付前自测）

- [ ] 没有硬编码颜色（grep `bg-black|text-white|bg-gray-|bg-amber-|text-white/90` 应该 0 命中）
- [ ] 没有 backdrop-blur 玻璃拟态（grep `backdrop-blur-2xl` 应该 0 命中）
- [ ] 没有装饰性模糊光晕（grep `blur-3xl` 应该 0 命中）
- [ ] 没有引入项目外的字体
- [ ] 浅色 / 暗色模式都做了（或者明确说只做了一组）
- [ ] 三态（loading / error / empty）在 WeatherCard 中至少展示了 1 种
- [ ] 三联指标 / 未来 4 天 / 24h 折线图都真实有数据
- [ ] 1440×900 视口下排版不溢出
- [ ] 暗色截图（在 data-color-scheme="midnight" 下）单独存在 `*-dark.png`

---

## 8. 交付后动作

1. 三个 subagent 完成后用 playwright 截图：浅色 + 暗色各 1 张，共 6 张
2. 一次性展示 6 张截图给用户
3. 用户选一版（或混合：例如 "C 的氛围感 + B 的折线图"）
4. 选定后再把代码迁回 `WeatherCard.vue` + `HourlyChartCard.vue` 两个 .vue 文件，保留 `DashboardCard` chrome、不破坏现有 props / events、不动 store

---

**禁止做的**：
- 引入新字体
- 引入新依赖（除了 echarts CDN）
- 删掉 qi-icon
- 改 DashboardCard.vue
- 改 store
- 改 design system token
</content>
</invoke>