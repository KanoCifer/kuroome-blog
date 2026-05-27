# React 前端同步进度跟踪

> 基准 commit: `c57536761269bdc4eb21f50122fcab3114b33def`
> 最后更新: 2026-05-27 (HEAD: `97c1111`)

## 已同步 (13 commits)

| Commit | 说明 | 涉及文件 |
|---|---|---|
| `c77b12f` | GET books 端点改为复数 `/books` | `services/bookService` |
| `99c860e` | 上传图片 API 路径修正 | `services/uploadService` |
| `feb55c8` | 主题切换事件改用结构类型 | `stores/themeState`, `utils/themeTransition` |
| `aecde2f` | 偏好设置面板 | `BasicNav`, `themeState`, `themeTransition`, `base.css` |
| `fc1795a` | 字体切换 + 隐私协议页面 | `PrivacyPolicyView`, 路由, `themeState`, `base.css` |
| `526da25` | 重构用户追踪 | `authGateway`, `heartbeat`, `authState`, `BentoProfile` |
| `d587dda` | HTML meta 更新 | `index.html` |
| `0e83e65` | 主题 CSS 全量更新 + Blog 组件 | 全部主题 CSS + Blog 页面群 |
| `108c947` | changelog v3.0.0 | `changelog.json` |
| `4a98676` | changelog v3.0.1 | `changelog.json` |
| `2639b1b` | 依赖更新 | `package.json`, `pnpm-lock.yaml` |
| `deab9a0` | 依赖更新 | `package.json`, `pnpm-lock.yaml` |
| `370480c` | 依赖更新 | `package.json`, `pnpm-lock.yaml` |

## 未同步 — 按功能分组

### 1. Twikoo 评论系统 (3 commits)

| Commit | 说明 |
|---|---|
| `fda4c14` | Twikoo 集成 + 客户端 Markdown 渲染 |
| `5171573` | Twikoo 评论组件 + UI 组件增强 (46 files, +1561/-771) |
| `4f99a10` | 杂项修复 (BasicDetail, BlogPostView) |

**关键文件**: `TwikooComments.vue`, `useTwikoo.ts`, `BlogPostView.vue` 大幅重构

**React 需要**: 新增 Twikoo 评论组件, 改造 BlogPostView 支持客户端 Markdown + 评论区

---

### 2. DevTasks / Todo 改造 (5 commits)

| Commit | 说明 |
|---|---|
| `1e8ab3a` | TodoList → DevTasks 重构 (11 files, +941/-1468) |
| `aba4860` | 看板拖拽 + v2 API 迁移 |
| `439336c` | Bento TodoCard 重构 |
| `b15c47c` | Todo 改造为全局侧边栏抽屉 |
| `529d2de` | 设置面板卡片配图切换标签 |

**关键文件**: `TodoListView.vue`, `DevTaskCard.vue`, `TodoColumn.vue`, `TodoMoal.vue`, `todoGateway.ts`, `stores/todos.ts`

**React 需要**: 看板拖拽 (react-beautiful-dnd 或 dnd-kit), v2 API 迁移, 侧边栏抽屉

---

### 3. Bento 卡片系统 (5 commits)

| Commit | 说明 |
|---|---|
| `6f9eeeb` | Bento 卡片布局系统重构, 拖拽排序 + 季节主题 |
| `a07d120` | TodoCard → BentoPic 替换 |
| `824a6be` | 延迟指示器, 背景控件, 友链重做 |
| `aa0441a` | 首页布局调整 |
| `04603e4` | Greeting Toast 动画重设计 |

**关键文件**: `useCardLayout.ts`, `useCardDrag.ts`, `useCardImage.ts`, `EntryView.vue`, `BentoPic.vue`, `GreetingToast.vue`

**React 需要**: 卡片布局 composable 等价实现, 拖拽排序, 季节主题

---

### 4. 博客系统 (4 commits)

| Commit | 说明 |
|---|---|
| `5b4c1a4` | 博客编辑器重构 + 清理无用组件 |
| `d1fb9bc` | 博客卡片重设计 (编辑式排版 + 交错动画) |
| `569c418` | Blog 页 UI 调整 |
| `706c7cc` | Redis 连接池 + 访客集合替代在线 count |

**关键文件**: `BlogEditorView.vue`, `BlogListView.vue`, `BlogPostView.vue`, `BlogListItem.vue`, `ArticleSummaryCard.vue`

**React 需要**: 博客编辑器增强, 列表卡片重设计

---

### 5. RSS 订阅重构 (1 commit)

| Commit | 说明 |
|---|---|
| `8d8fb09` | RssSubscriptionsView 拆分为 composable + 子组件架构 |

**React 需要**: 对应组件拆分

---

### 6. 友链页面 (3 commits)

| Commit | 说明 |
|---|---|
| `89866a6` | 新增友链页面 |
| `cf7adac` | 重构友链页 |
| `74c152b` | 每日推荐 banner |

**关键文件**: `FriendLinksView.vue` (经历多次重写)

**React 需要**: 全新友链页面 + 推荐 banner

---

### 7. 统计分析 (3 commits)

| Commit | 说明 |
|---|---|
| `1631b87` | ECharts 统一 + 统计行合并 |
| `e93dd6a` | 降雨量改柱状图 |
| `1232e42` | 修复未引入 BarChart |

**关键文件**: `AnalyticsView.vue`, `TrendChartCard.vue`, `OsCharts.vue`, `PopularPagesChartCard.vue`

**React 需要**: 统一图表到 ECharts, 降水柱状图

---

### 8. 钓鱼功能 (2 commits)

| Commit | 说明 |
|---|---|
| `41c52da` | 钓鱼统计 + 图标组件 + 友链更新 + 地图 bug 修复 |
| `2bf2741` | 首页天气数据接口 |

**React 需要**: 钓鱼统计指标, 地图数据修复

---

### 9. WebSocket 重构 (1 commit)

| Commit | 说明 |
|---|---|
| `0d5d2ac` | WebSocket 在线追踪替换 HTTP 心跳 |

**React 需要**: 心跳机制迁移至 WS

---

### 10. UI / 样式 (5 commits)

| Commit | 说明 |
|---|---|
| `c4db4b0` | 背景图固定/随机选择器 + Averia 本地字体 |
| `d08ab6e` | 主题配色更新 |
| `cb815bc` | 多配色方案 CSS 自定义属性 |
| `91b0591` | UI 细节改进 |
| `b4306df` | 样式调整 |

---

### 11. 其他修复

| Commit | 说明 |
|---|---|
| `1d7a14e` | 首页 nav 过渡动画修复 |
| `11276cd` | book 端点错误修复 |
| `8faeffd` | BasicDetail 挂载时重置滚动位置 |
| `96136ff` | cardIndex 模块级单例修复 |
| `bb64a46` | 卡片配图刷新后重置修复 |

---

### 12. 目录结构重组 (1 commit)

| Commit | 说明 |
|---|---|
| `97c1111` | 前后端分层 + 前端目录重组 (70 files) |

变更摘要:
- `analyse/` → `analytics/`
- `general/fishing/` → `fishing/`
- `general/messages/` → `messages/`
- `general/pages/` → `pages/` (About, Changelog, Home, NotFound, Privacy, Websites)
- `general/icon/` → `components/icons/`
- `nav/components/UserDropdown.vue` → `nav/UserDropdown.vue`
- `TodoMoal.vue` → `TodoModal.vue` (typo fix)
- `TodoListView.vue` → `todos/TodoListView.vue`
- DevTaskCard 系列移至 `views/todos/components/`

**React 不需要同步目录结构**, 但注意 React 的路由引用路径需与后端 API 对齐。

---

## 统计

| 指标 | 数值 |
|---|---|
| Vue 独有 commits | ~42 |
| React 已同步 commits | 13 |
| 最大单次改动 | `5171573` (+1561/-771, 46 files) |
| 涉及新页面 | 友链页、隐私协议 |
| 涉及新组件 | Twikoo 评论、DevTaskCard、TodoColumn、BentoPic |
